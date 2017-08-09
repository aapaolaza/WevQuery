# Input formats

This document describes the format in which each of the inputs should be formatted so it can be used for each of the algorithms.

## Frequent itemset mining

A text file in which each line corresponds to a set of items

## Association Rules

Same as frequent itemset, each line corresponds to a set of items.

## Sequential patterns

Sequences of itemsets, which are events considered to be taking place at the same time. Each item in an itemset is separated with a space, and each itemset is separated with a -1. The end of the sequence is marked with a -2.