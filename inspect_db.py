import os
from motor.motor_asyncio import AsyncIOMotorClient

async def inspect_mongodb():
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    mongo_db_name = os.getenv('MONGO_DB_NAME', 'voltstream')

    client = AsyncIOMotorClient(mongo_uri)
    db = client[mongo_db_name]

    print("=" * 60)
    print("MONGODB SCHEMA INSPECTION")
    print("=" * 60)

    # Get all collections
    collections = await db.list_collection_names()
    print(f"\nCollections found: {len(collections)}\n")

    for collection_name in collections:
        collection = db[collection_name]
        print(f"\nCollection: {collection_name}")

        # Get sample document to infer schema
        sample = await collection.find_one()
        if sample:
            print("Sample document fields:")
            for field in sample.keys():
                print(f"  {field}: {type(sample[field]).__name__}")

        # Get count
        count = await collection.count_documents({})
        print(f"  Document count: {count}")

    client.close()
    print("\n" + "=" * 60)
    print("MongoDB inspection completed successfully.")
    print("=" * 60)

if __name__ == "__main__":
    import asyncio
    asyncio.run(inspect_mongodb())
