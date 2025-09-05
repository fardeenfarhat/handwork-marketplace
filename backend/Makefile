.PHONY: install dev test lint format clean run migrate

# Install dependencies
install:
	pip install -r requirements.txt

# Install development dependencies
dev:
	pip install -r requirements.txt
	pip install pre-commit
	pre-commit install

# Run tests
test:
	pytest

# Run linting
lint:
	flake8 app tests
	black --check app tests
	isort --check-only app tests

# Format code
format:
	black app tests
	isort app tests

# Clean up
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +

# Run development server
run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Create migration
migrate:
	alembic revision --autogenerate -m "$(msg)"

# Apply migrations
upgrade:
	alembic upgrade head

# Downgrade migration
downgrade:
	alembic downgrade -1