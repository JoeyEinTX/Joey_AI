"""
JoeyAI - AI-powered chat interface with Ollama integration

A Flask-based web application for interacting with local LLM models via Ollama.
Supports conversation management, memory storage, and OpenAI-compatible API.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read the README file for long description
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else __doc__

setup(
    name="joeyai",
    version="1.0.0",
    author="Joey",
    description="AI-powered chat interface with Ollama integration",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/JoeyEinTX/Joey_AI",
    project_urls={
        "Bug Reports": "https://github.com/JoeyEinTX/Joey_AI/issues",
        "Source": "https://github.com/JoeyEinTX/Joey_AI",
    },
    packages=find_packages(include=["backend", "backend.*"]),
    include_package_data=True,
    package_data={
        "": ["*.json", "*.toml"],
    },
    python_requires=">=3.8",
    install_requires=[
        "Flask>=3.0.0",
        "requests>=2.31.0",
        "urllib3>=2.0.7",
        "python-dotenv>=1.0.0",
        "gunicorn>=21.2.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "joeyai=backend.app:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Application Frameworks",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Framework :: Flask",
    ],
    keywords="ai llm ollama chat flask api",
)
