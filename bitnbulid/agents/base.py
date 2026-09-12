import logging

class BaseAgent:
    """Base class for all Bit-N-Bulid agents."""

    def __init__(self, name: str | None = None):
        self.name = name or self.__class__.__name__
        self.log = logging.getLogger(self.name)
