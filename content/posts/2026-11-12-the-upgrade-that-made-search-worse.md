---
title: The upgrade that made my search worse
date: 2026-11-12
summary: I measured keyword, semantic and hybrid product search on 480 human-labelled queries. The fanciest model lost.
tags: [search, evaluation, embeddings]
---

In 2014 I built a price-comparison search engine for Canadian electronics stores: Scrapy crawled the shops, Django stored the products, and Elasticsearch searched them. This year I rebuilt it to answer a question I couldn't answer back then: **how much better does modern search actually get, and how would you know?**

## You need labels to know

"It feels better" isn't a measurement. So I switched from scraped stores to [WANDS](https://github.com/wayfair/WANDS), an open dataset from Wayfair: 43,000 products and 480 real shopper queries, with 233,000 query-product pairs that people judged *Exact*, *Partial* or *Irrelevant*. That lets you score a ranking the way search teams do, with **NDCG@10**: how good the first page is, weighting results near the top more.

## Five approaches

| Approach | NDCG@10 | Exact matches in top 10 | Latency |
|---|---:|---:|---:|
| 2014: keyword search on titles | 0.706 | 32.7% | 0.2 ms |
| Keyword search (BM25) on all fields | 0.712 | 38.9% | 0.3 ms |
| Semantic search (embeddings) | 0.740 | 37.6% | 12 ms |
| **Hybrid: BM25 + semantic** | **0.772** | **40.3%** | **11 ms** |
| Hybrid + cross-encoder reranker | 0.763 | 40.1% | 206 ms |

A few things surprised me.

## 1. The 2014 bottleneck wasn't the engine

My 2014 index template only included the product title. Indexing descriptions and features too, with the same BM25 scoring, lifted exact first-page matches from 33% to 39% for almost no cost. Elasticsearch was fine; my index was the problem.

## 2. Keyword and semantic search fail on different queries

That's the whole case for hybrid search, and the per-query scores show it plainly:

- **"chabely 5 draw chest"** (a misspelt "drawer"): BM25 scored 0.14, semantic search 1.00.
- **"black fluffy stool"**: 0.06 for BM25, 0.92 for semantic.
- **"trinaic towel rod"** (a rare product name): BM25 1.00, semantic 0.20.
- **"kelly clarkson light fixtures"**: BM25 0.94, semantic 0.42.

Embeddings blur exact names into "things like this"; keywords can't bridge a typo. Merging the two rankings with reciprocal rank fusion keeps most of both strengths. Hybrid beat the 2014 approach on 217 queries and lost on 134.

## 3. The reranker made it worse

A cross-encoder reranker rescores the top 50 results by reading each query-product pair together. It's the textbook next step, and I fully expected it to win. It scored **0.763 against 0.772** for plain hybrid, at **20× the latency**.

The model I used was trained on web search questions, not furniture listings. On this data, its idea of relevance simply didn't match what shoppers judged relevant. Without the labelled evaluation, I would have shipped it as an obvious upgrade.

## 4. Know what your metric can't see

WANDS labels were collected from the results of earlier systems. Products nobody labelled count as irrelevant, and between 10% and 17% of each approach's top 10 was unlabelled. Newer approaches that surface different products are, if anything, slightly under-credited. That doesn't change the ranking here, but it's the kind of caveat that belongs next to the numbers.

## Takeaways

- **Fix the cheap things first.** Indexing the right fields beat an entirely new retrieval method.
- **Hybrid beats either half** when the failure modes differ.
- **Measure before you trust a bigger model.** The most sophisticated stage was the only one that lost.

The code, per-query results and a side-by-side 2014 vs 2026 web app are in [searchbench](https://github.com/mertmetin/searchbench).
