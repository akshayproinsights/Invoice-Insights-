# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.11-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Copy local code to the container image.
ENV APP_HOME /app
WORKDIR $APP_HOME

# Install dependencies.
COPY requirements.txt ./
# Update pip and install requirements
# Added --no-cache-dir to keep image small
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . ./

# Expose port 8080 (default for Cloud Run)
EXPOSE 8080

# Run the web service on container startup.
# Using uvicorn directly as gunicorn is not strictly required for single-worker container model,
# but can be added if worker management is needed.
# For Cloud Run, single process per container with auto-scaling is common.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
