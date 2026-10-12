
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    lang="it",
    engine="onnxruntime",  # paddlepaddle is not installed, see requirements.txt
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)

def analyze_image(file_path):

    print(f"Analyzing image file: {file_path}...", flush=True)

    result = ocr.predict(file_path)

    texts = []

    # one result per page/image, each with the recognized lines and their scores
    for res in result:
        for text, score in zip(res["rec_texts"], res["rec_scores"]):
            print(
                f"{text} (confidence: {score:.2f})",
                flush=True
            )
            texts.append(text)

    print("Image analysis finished", flush=True)

    return texts
