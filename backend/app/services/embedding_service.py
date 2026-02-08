from sentence_transformers import SentenceTransformer
import chromadb

model = SentenceTransformer("all-MiniLM-L6-v2")

chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("lecture_notes")


def create_embeddings_for_sections(sections):
    """
    Store section text embeddings in Chroma.
    """

    docs = [s["text"] for s in sections]
    ids = [f"section_{i}" for i in range(len(sections))]

    embeddings = model.encode(docs).tolist()

    collection.add(
        documents=docs,
        embeddings=embeddings,
        ids=ids
    )


def search_sections(query, k=3):
    """
    Retrieve most relevant sections.
    """

    query_embedding = model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=k
    )

    return results["documents"][0]
