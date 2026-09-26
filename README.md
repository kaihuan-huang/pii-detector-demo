# PII Detector Demo

**Live:** https://kaihuan-huang.github.io/pii-detector-demo/

Finds card numbers, emails, phone numbers and API keys before text leaves the device, and shows the masked text a language model would receive. An independent reimplementation; all data is synthetic.

- **Rules first:** card numbers must pass a Luhn check, so an order number is never called a card. Repeated values keep the same placeholder.
- **Local model, optional:** [openai/privacy-filter](https://huggingface.co/openai/privacy-filter) (Apache-2.0) runs in the browser on WebGPU after a one-time download (about 840 MB) and adds names, addresses and dates. The page counts network requests during detection: 0.
- On a local NVIDIA GB10 GPU, rules plus model ran at p50 95 ms / p95 136 ms over 5,466 synthetic records; the rules layer alone at p95 0.5 ms.

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000 (WebGPU needs Chrome or Edge)
```
