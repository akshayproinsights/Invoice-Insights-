"""
Image hash utilities for duplicate detection.
"""
import hashlib
from typing import BinaryIO


def calculate_image_hash(image_bytes: bytes) -> str:
    """
    Calculate SHA-256 hash of image bytes.
    
    Args:
        image_bytes: Raw image data as bytes
        
    Returns:
        Hexadecimal string representation of SHA-256 hash (64 characters)
    """
    sha256_hash = hashlib.sha256()
    
    # For bytes, hash directly
    sha256_hash.update(image_bytes)
    
    return sha256_hash.hexdigest()


def calculate_file_hash(file_path: str) -> str:
    """
    Calculate SHA-256 hash from a file path.
    Uses chunked reading for memory efficiency with large files.
    
    Args:
        file_path: Path to the image file
        
    Returns:
        Hexadecimal string representation of SHA-256 hash (64 characters)
    """
    sha256_hash = hashlib.sha256()
    
    with open(file_path, "rb") as f:
        # Read in 4KB chunks for memory efficiency
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    
    return sha256_hash.hexdigest()


def calculate_stream_hash(stream: BinaryIO) -> str:
    """
    Calculate SHA-256 hash from a binary stream.
    
    Args:
        stream: Binary stream to hash
        
    Returns:
        Hexadecimal string representation of SHA-256 hash (64 characters)
    """
    sha256_hash = hashlib.sha256()
    
    # Read in 4KB chunks
    for chunk in iter(lambda: stream.read(4096), b""):
        sha256_hash.update(chunk)
    
    return sha256_hash.hexdigest()
