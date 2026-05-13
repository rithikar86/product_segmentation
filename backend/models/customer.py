from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from bson import ObjectId


def _normalize_string(value: Any) -> str:
    if value is None:
        return ''
    return str(value).strip()


def _normalize_email(value: Any) -> str:
    return _normalize_string(value).lower()


@dataclass
class Customer:
    shop_owner_id: Any
    name: str
    email: str
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    _id: Optional[ObjectId] = None

    def __post_init__(self) -> None:
        if not self.shop_owner_id:
            raise ValueError('shop_owner_id is required for every customer record')
        if not self.name:
            raise ValueError('Customer name is required')
        if not self.email:
            raise ValueError('Customer email is required')

        self.name = _normalize_string(self.name)
        self.email = _normalize_email(self.email)
        if self.phone is not None:
            self.phone = _normalize_string(self.phone)
        if self.telegram_id is not None:
            self.telegram_id = _normalize_string(self.telegram_id)

    def to_document(self) -> Dict[str, Any]:
        document: Dict[str, Any] = {
            'shop_owner_id': self.shop_owner_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'telegram_id': self.telegram_id,
            'metadata': self.metadata,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
        if self._id is not None:
            document['_id'] = self._id
        return document


def build_customer_document(data: Dict[str, Any]) -> Dict[str, Any]:
    customer = Customer(
        shop_owner_id=data.get('shop_owner_id'),
        name=data.get('name', ''),
        email=data.get('email', ''),
        phone=data.get('phone'),
        telegram_id=data.get('telegram_id'),
        metadata=data.get('metadata', {}),
        _id=data.get('_id'),
    )
    return customer.to_document()
