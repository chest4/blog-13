---
title: Asynchronous implementation of LZW algorithm in Javascript
date: '2011-08-01'
excerpt: "Praesent elementum facilisis leo vel fringilla est ullamcorper eget. At imperdiet dui accumsan sit amet nulla facilities morbi tempus."

---
I'm quite pleased to announce availability of my latest mini-project - an efficient Javascript implementation of the [Lempel-Ziv-Welsh (LZW) compression algorithm](http://en.wikipedia.org/wiki/Lempel–Ziv–Welch). It's **only 4 KB** (minified size) and available right now from [Github](https://github.com/hiddentao/lzw-async) where you'll also find instructions on use and the full API. This post provides details of the implementation and discusses some of the design decisions, as well as providing some performance metrics.
<a id="more"></a><a id="more-1281"></a>

I needed client-side data compression for a project I'm working on and after much searching on the web and not finding anything that was good enough for my needs I decided to implement LZW, one of the simpler compression algorithms out there. First off I'd like to thank the authors of the following very useful LZW resources:

* [http://warp.povusers.org/EfficientLZW/index.html](http://warp.povusers.org/EfficientLZW/index.html)
* [http://rosettacode.org/wiki/LZW_compression#JavaScript](http://rosettacode.org/wiki/LZW_compression#JavaScript)
* [http://marklomas.net/ch-egg/articles/lzwjs.htm](http://marklomas.net/ch-egg/articles/lzwjs.htm)
* [http://michael.dipperstein.com/lzw/](http://michael.dipperstein.com/lzw/)

The first link in particular was the most useful in that Juha Nieminen (the author) both provides *and* explains his highly memory and speed efficient C implementation of LZW. My implementation matches his quite closely except that I had take into account the performance differences between Javascript and C (in particular, memory allocation and strings) when coding my version.

## LZW - the algorithm ##

For those not familiar with LZW it's a lossless data compression algorithm which is very simple to implement both in terms of lines of code and the general concept behind it. In a nutshell, the algorithm goes through the source data from start to finish, slowly building up a *dictionary* of strings, whereby each string is a pattern of characters which has occurred at least once within the source data. Each string in the dictionary is represented by an integer code. If a given pattern is seen more than once then the second occurrence of the pattern in the data could be represented by the dictionary integer code representing the pattern. Thus the output of the compressor is a sequence of numbers, with each number representing a particular string pattern.

The beauty of LZW is that the decompression phase does not need to know the dictionary used for the compression phase because it too can build it up as it goes along. All LZW implementation follow this same basic principle so if you want to see a step-by-step example of compression and decompression (including what the dictionary looks like at each step) then head over to [Michael Dipperstein's page](http://michael.dipperstein.com/lzw/). Michael also covers the special exception case in the decompression phase whereby an integer code is encountered which doesn't yet have a matching pattern in the dictionary.

Once you've implemented the algorithm in a simple manner there are numerous optimisations which can be done to decrease both the time taken to compress the data as well as the size of the compressed output.

## Asynchronous-ness

Before I delve into the optimisations just a note on the asynchronicity of my implementation. If I'm dealing with large volumes of data I want to be able to provide a progress report to the user (e.g. percentage complete). None of the other Javascript LZW implementations I found were asynchronous - they all assumed that everything would be done quickly. Even if your source data isn't that big there is a difference in performance between browsers so anything you can do to avoid locking up the Javascript event loop and re-assure the user is a good thing.

My implementation runs in the background (using `setTimeout()`) and invokes a user-supplied callback every half a second with a *percentage completed* number. Once compression/decompression is fully complete a second user-supplied callback is invoked with the output data.

## Speeding up compression

Juha uses a [binary search tree to store the strings](http://warp.povusers.org/EfficientLZW/part4.html) in his compression dictionary and I've implemented the same in mine. To save memory [he doesn't store full strings in his tree nodes](http://warp.povusers.org/EfficientLZW/part2.html) - just a character which is the suffix of the string and a pointer to another tree node as the prefix of the string. So each time he wants to get the full string he has to traverse a number of nodes. I decided not to implement this and instead went for storing the the full string in each code - so mine takes up more memory but with the benefit of increased string extraction speed. To be honest I'm planning to implement it his way at some point and see how much difference it makes because my choice might not be optimal!

## Speeding up decompression

Juha uses a binary search tree and tree nodes for decompression - allowing him to share one dictionary implementation for both phases. Since I store full strings in my dictionary and because decompression involves lookups by integer codes and not strings using binary tree nodes for the decompression phase incurred an unnecessary performance penalty. So I still share a single dictionary object between compression and decompression but the dictionary behaves as a simple `Object` key-value map in decompression phase to maximise speed.

## Reducing compressed output size

I've implemented variable-length bit encoding for the output. Thus each integer is written to a bit stream using the least number of bits necessary to represent it. The bitstream writer writes bits to a Javascript string. Javascript strings are always UTF-16 which made things easy. The dictionary size is limited to 65536 strings (i.e. 2^16 - 1) for this reason too.

To further reduce the compressed output size the algorithm permits the you to submit the list of characters with which to initialise the dictionary. By default the dictionary initialises itself with the first 256 ASCII characters (thus limiting the source data to only contain these characters). By submitting a smaller list of initialisation characters - and thus telling the compressor only to expect those characters in the input data - the compressed output size can be significantly reduced. Note, however, that the exact same list of characters will need to be passed to the decompressor in order to get back the original input data.

## Performance measurements

The test rig consists of:

* Intel Core2 Duo E7500 @ 2.98 GHz
* 4GB RAM
* Chrome 12.0.742.124, 14 tabs open

I run the tests in the bundled `index.html` demo page to get these results:

```
Test short pattern (72 chars, 144 bytes)...
-- compress time: 5 ms, output size: 16.66%
-- decompress time: 5 ms
Test medium pattern (5592 chars, 11184 bytes)...
-- compress time: 11 ms, output size: 2.59%
-- decompress time: 5 ms
Test lipsum (83523 chars, 167046 bytes)...
-- compress time: 68 ms, output size: 45.95%
-- decompress time: 31 ms
Test large lipsum (2672736 chars, 5345472 bytes)...
-- compress time: 1829 ms, output size: 48.04%
-- decompress time: 844 ms
All tests passed.
```

A key measurement is the last one - **Test large lipsum**. This is ~5MB of text data being compressed within 2 seconds to less than half it's original size (this time includes progress indication callbacks). Decompression takes less than 1 second. The second test result shows how efficient LZW is when a given string pattern is heavily repeated throughout.

If we were to restrict the initial character list to just the latin alphabet the size would be reduced even further. Take the sample input text which shows when you first load the page:

```
abcabcabcabcabcabcabcabcabcabcabcabc  // 36 chars
```

Compressing using the normal dictionary results in output of 9 chars, or 25% of the input size. Initializing the dictionary with the characters `abc` instead results in output of 4 chars, or ~11% of the input size (more than halving the previous result!).

I've added timings for the tests taken in two more browsers on the same machine as above (all timings are in millseconds and in *compression / decompression* order):

| Browser | Short pattern (144 bytes) | Medium pattern (~11 KB) | Lipsum (~163 KB) | Large Lipsum (~5 MB) |
| --- | --- | --- | --- | --- |
| Chrome 12.0.742.124 | 5 / 5 | 11 / 5 | 68 / 31 | 1829 / 844 |
| Firefox 5.0 | 10 / 10 | 13 / 10 | 148 / 98 | 4927 / 3712 |
| Opera 11.10 | 11 / 11 | 15 / 11 | 135 / 52 | 5744 / 1510 |

Chrome leads the pack as expected. I noticed Opera's progress on the large lipsum seemed to pause every now and then, presumably whenever the compression dictionary need to be reset due to being full. Firefox seemed to suffer this a bit too though not as much as Opera.

## Known limitations

As mentioned above input data for the algorithm is limited to the first 256 ASCII characters even though Javascript supports UTF-16 strings. Thanks to variable bit-length encoding it shouldn't be too difficult to extend support for all UTF-16 characters if need be, though I'm not yet hard pressed enough to do this. Perhaps when I need to store other non-latin text I'll get round to it. For now I can use base64 encode my input prior to compression and then limit the initial dictionary character list to minimise the compressed output size.

## Conclusion

I really hope somebody finds this implementation useful. If you do use it in a project please please let me know so that I can add a link somewhere, most likely on Github. And please do fork it and hack it like crazy if you think/know you can make it better.

You'll find instructions on using it and full API documentation at Github: [https://github.com/hiddentao/lzw-async](https://github.com/hiddentao/lzw-async).
