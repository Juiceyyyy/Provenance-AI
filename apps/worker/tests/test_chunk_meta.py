from grounded_worker.chunking import _pages


def test_pages_are_unique_and_sorted():
    meta = {"doc_items": [{"prov": [{"page_no": 3}, {"page_no": 1}]}, {"prov": [{"page_no": 3}]}]}
    assert _pages(meta) == [1, 3]
