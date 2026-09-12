from bitnbulid.demo.mini_loop import run
import pytest

def test_mini_loop_execution(session):
    with pytest.raises(SystemExit) as exc_info:
        run()
    assert exc_info.value.code == 0
