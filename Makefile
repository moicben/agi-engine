install:
	pip install -r requirements.txt

run:
	uvicorn core.service.api:api --reload

test:
	PYTHONPATH=. pytest
