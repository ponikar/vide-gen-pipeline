import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(description="Align known transcript text to generated TTS audio with WhisperX.")
    parser.add_argument("--requests", required=True, help="JSON file containing segment alignment requests.")
    parser.add_argument("--out", required=True, help="JSON output path for word timings.")
    parser.add_argument("--language", default="en", help="Language code for WhisperX alignment.")
    parser.add_argument("--device", default=None, help="Optional WhisperX device override, e.g. cpu or cuda.")
    args = parser.parse_args()

    try:
        import torch
        import whisperx
    except ModuleNotFoundError as exc:
        print(
            "WhisperX alignment dependency is missing. Install it with: python3 -m pip install whisperx",
            file=sys.stderr,
        )
        raise exc

    with open(args.requests, "r", encoding="utf-8") as file:
        payload = json.load(file)

    requests = payload.get("segments")
    if not isinstance(requests, list):
        raise ValueError("requests JSON must contain a segments array")

    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    model, metadata = whisperx.load_align_model(language_code=args.language, device=device)
    aligned_segments = []

    for request in requests:
        segment_id = request["id"]
        audio_path = request["audioPath"]
        text = request["text"]
        duration = float(request["durationSeconds"])
        transcript_segments = [{"start": 0.0, "end": duration, "text": text}]
        result = whisperx.align(
            transcript_segments,
            model,
            metadata,
            audio_path,
            device,
            return_char_alignments=False,
        )

        words = []
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                if "start" not in word or "end" not in word or "word" not in word:
                    continue
                words.append(
                    {
                        "word": str(word["word"]).strip(),
                        "startSeconds": float(word["start"]),
                        "endSeconds": float(word["end"]),
                    }
                )

        aligned_segments.append({"id": segment_id, "words": words})

    with open(args.out, "w", encoding="utf-8") as file:
        json.dump({"segments": aligned_segments}, file, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
