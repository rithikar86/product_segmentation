import asyncio
import os
import time
import threading
from typing import List, Optional

from dotenv import load_dotenv
from bson.objectid import ObjectId
from pymongo import MongoClient
from telegram import Bot
from telegram.error import TelegramError
import pywhatkit as kit

load_dotenv()

import sib_api_v3_sdk
from sib_api_v3_sdk import ApiClient, Configuration, TransactionalEmailsApi as SMTPApi, SendSmtpEmail, SendSmtpEmailSender, SendSmtpEmailTo


class VoltStreamTelegramBot:
    def __init__(self, bot_token: str, simulation_mode: bool = False):
        self.bot_token = bot_token
        self.simulation_mode = simulation_mode

        if not self.bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN not found in environment variables")

        self.bot = Bot(token=self.bot_token)

    async def send_bulk_alerts(self, user_ids: List[int], message: str) -> dict:
        success_count = 0
        failure_count = 0
        errors = []

        for user_id in user_ids:
            try:
                if self.simulation_mode:
                    print(f"[SIMULATION] Would send to user {user_id}: {message}")
                else:
                    await self.bot.send_message(chat_id=user_id, text=message)

                success_count += 1
                print(f"Successfully sent alert to user {user_id}")
            except TelegramError as e:
                failure_count += 1
                error_msg = f"Failed to send to user {user_id}: {str(e)}"
                errors.append(error_msg)
                print(error_msg)
            except Exception as e:
                failure_count += 1
                error_msg = f"Unexpected error for user {user_id}: {str(e)}"
                errors.append(error_msg)
                print(error_msg)

            await asyncio.sleep(0.04)

        return {
            'success_count': success_count,
            'failure_count': failure_count,
            'errors': errors
        }


class NotificationService:
    def __init__(self):
        self.mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
        self.mongo_db_name = os.getenv('MONGO_DB_NAME', 'voltstream_db')
        self.brevo_api_key = os.getenv('BREVO_API_KEY')
        self.default_sender_email = os.getenv('BREVO_SENDER_EMAIL', 'no-reply@retail-insights.com')
        self.default_sender_name = os.getenv('BREVO_SENDER_NAME', 'Retail Insights')
        self.telegram_bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.simulation_mode = os.getenv('SIMULATION_MODE', 'True').lower() == 'true'

        if not self.brevo_api_key:
            print('[WARNING] BREVO_API_KEY is not configured. Email sending will not work.')
        if not self.telegram_bot_token:
            print('[WARNING] TELEGRAM_BOT_TOKEN is not configured. Telegram alerts may not work.')

        self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
        self.db = self.client[self.mongo_db_name]
        self.customers_collection = self.db.customers

    def _normalize_shop_owner_id(self, shop_owner_id):
        if shop_owner_id is None:
            return None
        if isinstance(shop_owner_id, str) and ObjectId.is_valid(shop_owner_id):
            return ObjectId(shop_owner_id)
        return shop_owner_id

    def _build_customer_query(self, segment: str, shop_owner_id) -> dict:
        query = {'segment': segment}
        normalized_id = self._normalize_shop_owner_id(shop_owner_id)
        if normalized_id is not None:
            query['shop_owner_id'] = normalized_id
        query['email'] = {'$exists': True, '$ne': ''}
        return query

    def fetch_segmented_customers(self, segment: str, shop_owner_id) -> List[dict]:
        """Return tenant-scoped customers in the requested segment."""
        try:
            query = self._build_customer_query(segment, shop_owner_id)
            customers = list(self.customers_collection.find(query, {'email': 1, 'name': 1, 'segment': 1}))
            print(f"[*] Found {len(customers)} customers for segment={segment} and shop_owner_id={shop_owner_id}")
            return customers
        except Exception as e:
            print(f"[ERROR] Error fetching segmented customers: {e}")
            return []

    def _build_recipients(self, customers: List[dict]) -> List[SendSmtpEmailTo]:
        recipients = []
        for customer in customers:
            email = customer.get('email')
            name = customer.get('name') or None
            if not email:
                continue
            recipients.append(SendSmtpEmailTo(email=email, name=name))
        return recipients

    def _build_sender(self, sender_email: Optional[str], sender_name: Optional[str]) -> SendSmtpEmailSender:
        return SendSmtpEmailSender(
            email=sender_email or self.default_sender_email,
            name=sender_name or self.default_sender_name
        )

    def send_segmented_email(
        self,
        segment: str,
        subject: str,
        html_content: str,
        sender_email: Optional[str] = None,
        sender_name: Optional[str] = None,
        shop_owner_id=None
    ) -> dict:
        """Send a segmented email campaign using Brevo bulk email logic."""
        if not segment or not html_content:
            return {'success': False, 'error': 'Segment and html_content are required.'}

        recipients = self.fetch_segmented_customers(segment, shop_owner_id)
        if not recipients:
            return {
                'success': False,
                'error': 'No recipients found for the selected segment and tenant.',
                'recipient_count': 0
            }

        if self.simulation_mode:
            print(f"[SIMULATION] Would send Brevo email to {len(recipients)} recipients for segment={segment}")
            return {
                'success': True,
                'simulation_mode': True,
                'recipient_count': len(recipients),
                'segment': segment,
                'shop_owner_id': str(shop_owner_id)
            }

        if not self.brevo_api_key:
            return {'success': False, 'error': 'BREVO_API_KEY is not configured.'}

        try:
            configuration = Configuration()
            configuration.api_key['api-key'] = self.brevo_api_key

            sender = self._build_sender(sender_email, sender_name)
            to_list = self._build_recipients(recipients)

            if not to_list:
                return {'success': False, 'error': 'No valid recipient email addresses found.'}

            email = SendSmtpEmail(
                sender=sender,
                to=to_list,
                subject=subject,
                html_content=html_content
            )

            with ApiClient(configuration) as api_client:
                api_instance = SMTPApi(api_client)
                response = api_instance.send_transac_email(email)

            return {
                'success': True,
                'recipient_count': len(to_list),
                'segment': segment,
                'shop_owner_id': str(shop_owner_id),
                'brevo_response': response.to_dict() if hasattr(response, 'to_dict') else str(response)
            }

        except sib_api_v3_sdk.exceptions.ApiException as api_ex:
            return {
                'success': False,
                'error': 'Brevo API exception',
                'details': str(api_ex)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_segmented_email_async(
        self,
        segment: str,
        subject: str,
        html_content: str,
        sender_email: Optional[str] = None,
        sender_name: Optional[str] = None,
        shop_owner_id=None,
        callback: Optional[callable] = None
    ) -> threading.Thread:
        def thread_target():
            result = self.send_segmented_email(
                segment,
                subject,
                html_content,
                sender_email=sender_email,
                sender_name=sender_name,
                shop_owner_id=shop_owner_id
            )
            if callback:
                callback(result)

        thread = threading.Thread(target=thread_target, daemon=True)
        thread.start()
        return thread

    def send_telegram_alerts(self, message: str, shop_owner_id=None) -> dict:
        """Send a Telegram alert to every tenant-scoped customer with a saved telegram_id."""
        if not message:
            return {'success': False, 'error': 'Message text is required.'}

        if not self.telegram_bot_token:
            return {'success': False, 'error': 'TELEGRAM_BOT_TOKEN is not configured.'}

        telegram_ids = self.fetch_customer_telegram_ids(shop_owner_id=shop_owner_id)
        if not telegram_ids:
            return {
                'success': False,
                'error': 'No tenant customers with Telegram IDs were found.',
                'recipient_count': 0,
                'shop_owner_id': str(shop_owner_id) if shop_owner_id is not None else None
            }

        try:
            bot = VoltStreamTelegramBot(self.telegram_bot_token, self.simulation_mode)
            result = asyncio.run(bot.send_bulk_alerts(telegram_ids, message))
            return {
                'success': True,
                'recipient_count': len(telegram_ids),
                'shop_owner_id': str(shop_owner_id) if shop_owner_id is not None else None,
                'telegram_result': result
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_telegram_alerts_async(self, message: str, shop_owner_id=None, callback: Optional[callable] = None) -> threading.Thread:
        def thread_target():
            result = self.send_telegram_alerts(message, shop_owner_id=shop_owner_id)
            if callback:
                callback(result)

        thread = threading.Thread(target=thread_target, daemon=True)
        thread.start()
        return thread

    def fetch_customer_telegram_ids(self, shop_owner_id=None) -> List[int]:
        query = {'telegram_id': {'$exists': True, '$ne': ''}}
        normalized_id = self._normalize_shop_owner_id(shop_owner_id)
        if normalized_id is not None:
            query['shop_owner_id'] = normalized_id

        telegram_ids = []
        try:
            docs = list(self.customers_collection.find(query, {'telegram_id': 1}))
            for doc in docs:
                telegram_id = doc.get('telegram_id')
                if telegram_id is None:
                    continue
                try:
                    telegram_ids.append(int(telegram_id))
                except (TypeError, ValueError):
                    continue
        except Exception as e:
            print(f"Error fetching Telegram IDs: {e}")

        return telegram_ids

    def send_bulk_telegram_async(self, telegram_ids: List[int], message: str) -> threading.Thread:
        def thread_target():
            try:
                bot = Bot(token=self.telegram_bot_token)
                async def send_async():
                    for tid in telegram_ids:
                        if self.simulation_mode:
                            print(f"[SIMULATION] Telegram to {tid}: {message}")
                        else:
                            await bot.send_message(chat_id=tid, text=message)
                        await asyncio.sleep(0.05)
                asyncio.run(send_async())
            except Exception as e:
                print(f"Failed to start Telegram broadcast: {e}")

        thread = threading.Thread(target=thread_target, daemon=True)
        thread.start()
        return thread

    def send_whatsapp_message(self, phone: str, message: str):
        """Sends a WhatsApp message using pywhatkit."""
        try:
            if not phone:
                return False
            
            # Ensure phone starts with +
            if not phone.startswith('+'):
                # Default to India (+91) if missing, or just log
                phone = f"+91{phone}" 

            if self.simulation_mode:
                print(f"[SIMULATION] WhatsApp to {phone}: {message}")
                return True
            
            # Send instantly (requires WhatsApp Web logged in)
            kit.sendwhatmsg_instantly(phone, message, wait_time=15, tab_close=True, close_time=3)
            print(f"WhatsApp message queued for {phone}")
            return True
        except Exception as e:
            print(f"WhatsApp Error: {e}")
            return False

    def close(self):
        self.client.close()


notification_service = NotificationService()
