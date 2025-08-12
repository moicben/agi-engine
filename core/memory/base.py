from abc import ABC, abstractmethod
from typing import List

class MemoryStore(ABC):
    @abstractmethod
    def put(self, session_id: str, item: str):
        pass

    @abstractmethod
    def query(self, session_id: str, k: int = 5) -> List[str]:
        pass

    @abstractmethod
    def summarize(self, session_id: str) -> str:
        pass
