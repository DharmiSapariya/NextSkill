FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

# Install the CPU-only torch build FIRST, from PyTorch's own index, before
# requirements.txt pulls in sentence-transformers (which depends on torch).
# Left to the default PyPI resolver, `torch` drags in the full CUDA/GPU
# toolkit as transitive dependencies (nvidia-cublas, nvidia-cudnn, triton,
# cuda-toolkit, ...) — several GB of libraries this API never touches, since
# it does CPU-only inference on a small model and this image has no GPU.
# Once torch is already installed and satisfies sentence-transformers'
# `torch>=2.2` constraint, the requirements.txt install below leaves it alone
# instead of trying to replace it.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the semantic role-matching model at build time — otherwise the
# first request that needs it stalls on a ~80MB download (or fails outright
# on a network-restricted host).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
