from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
from bson import ObjectId

@dataclass
class ShopOwner:
    email: str
    hashed_password: str
    shop_name: str
    owner_name: str
    location: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    _id: Optional[ObjectId] = None

    def __post_init__(self) -> None:
        if not self.email:
            raise ValueError('Email is required')
        self.email = self.email.strip().lower()

    def to_document(self) -> Dict[str, Any]:
        doc = {
            'email': self.email,
            'password_hash': self.hashed_password,
            'shop_name': self.shop_name,
            'owner_name': self.owner_name,
            'location': self.location,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
        if self._id:
            doc['_id'] = self._id
        return doc

    @staticmethod
    def from_document(doc: Dict[str, Any]) -> ShopOwner:
        return ShopOwner(
            email=doc.get('email', ''),
            hashed_password=doc.get('password_hash', ''),
            shop_name=doc.get('shop_name', ''),
            owner_name=doc.get('owner_name', ''),
            location=doc.get('location', ''),
            created_at=doc.get('created_at', datetime.utcnow()),
            updated_at=doc.get('updated_at', datetime.utcnow()),
            _id=doc.get('_id')
        )
