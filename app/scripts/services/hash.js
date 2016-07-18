'use strict';

// https://github.com/SheetJS/js-crc32/blob/master/crc32.js
let checksumable = stampit({
  static: {
    table: function signed_crc_table() {
    	var c = 0, table = new Array(256);

    	for(var n =0; n != 256; ++n){
    		c = n;
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    		table[n] = c;
    	}

    	return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
    },
    crc32 (str) {
    	var C = -1, T = this.table;
    	for(var i = 0, L=str.length, c, d; i < L;) {
    		c = str.charCodeAt(i++);
    		if(c < 0x80) {
    			C = (C>>>8) ^ T[(C ^ c)&0xFF];
    		} else if(c < 0x800) {
    			C = (C>>>8) ^ T[(C ^ (192|((c>>6)&31)))&0xFF];
    			C = (C>>>8) ^ T[(C ^ (128|(c&63)))&0xFF];
    		} else if(c >= 0xD800 && c < 0xE000) {
    			c = (c&1023)+64; d = str.charCodeAt(i++)&1023;
    			C = (C>>>8) ^ T[(C ^ (240|((c>>8)&7)))&0xFF];
    			C = (C>>>8) ^ T[(C ^ (128|((c>>2)&63)))&0xFF];
    			C = (C>>>8) ^ T[(C ^ (128|((d>>6)&15)|((c&3)<<4)))&0xFF];
    			C = (C>>>8) ^ T[(C ^ (128|(d&63)))&0xFF];
    		} else {
    			C = (C>>>8) ^ T[(C ^ (224|((c>>12)&15)))&0xFF];
    			C = (C>>>8) ^ T[(C ^ (128|((c>>6)&63)))&0xFF];
    			C = (C>>>8) ^ T[(C ^ (128|(c&63)))&0xFF];
    		}
    	}
    	return C ^ -1;
    }
  }
}),

// inspired by https://github.com/sjhorn/node-simhash/blob/master/lib/simhash.js
similarityable = stampit({
  static: {
    // 'use strict';
    // var crc32 = require('crc-32');
    // var natural = require('natural');
    // var NGrams = natural.NGrams;
    //
    // module.exports = {
    //     compare: compare,
    //     summary: summary,
    //     hammingWeight: hammingWeight,
    //     shingles: shingles,
    //     jaccardIndex: jaccardIndex,
    //     createBinaryString: createBinaryString,
    //     shingleHashList: shingleHashList
    // }
    //
    compare(file1, file2) {
        return this.similarity(this.simhash(file1), this.simhash(file2));
    },

    summary(file1, file2) {
        var hash1 = this.simhash(file1);
        var hash2 = this.simhash(file2);
        var simhashval = this.similarity(hash1, hash2);
        var jaccard = this.jaccardIndex(this.shingles(file1), this.shingles(file2));
        console.log("String 1 simhash:", this.createBinaryString(hash1));
        console.log("String 2 simhash:", this.createBinaryString(hash2));
        console.log( "Simhash similarity is "+simhashval+" (%d%% similar)", Math.round(simhashval * 100)  );
        console.log( "Jaccard index is "+jaccard+" (%d%% similar)", Math.round(jaccard * 100) );
    },

    hammingWeight(l) {
        var c;
        for(c = 0; l; c++) {
          l &= l - 1;
        }
        return c;
    },

    similarity(simhash1, simhash2) {
        return this.hammingWeight((simhash1 & simhash2)) / this.hammingWeight((simhash1 | simhash2));
    },

    shingleHashList(str) {
        var list = [];
        for (var word of this.shingles(str, 2)) {
            list.push(this.crc32(word) & 0xffffffff);
        }
        return list;
    },

    shingles(original, kshingles = 2) {
        var shingles = new Set();
        for(var wordlist of this.ngrams(original, kshingles, null, '[end]')) {
            shingles.add(wordlist.join(" "));
        }
        return shingles;
    },

    simhash(str) {
        var shingles = this.shingleHashList(str);
        var mask = 0x1;
        var simhash = 0x0;
        for (var i = 0; i < 64; i++) {
          var sim = 0;
          for (var s of shingles) {
              sim +=  ((s & mask) == mask) ? 1 : -1;
          }
          simhash |= (sim > 0 ? mask : 0x0);
          mask <<= 1;
        }
        return simhash;
    },

    jaccardIndex(set1, set2) {
      var total = set1.size + set2.size;
      var intersection = 0;
      for (var shingle of set1 ) {
        if(set2.has(shingle)) {
          intersection++;
        }
      }
      var union = total - intersection;
      return intersection / union;
    },

    createBinaryString (nMask) {
      for (var nFlag = 0, nShifted = nMask, sMask = ""; nFlag < 32;
           nFlag++, sMask += String(nShifted >>> 31), nShifted <<= 1);
      return sMask;
    },

    createBinaryArray (nMask) {
      for (var nFlag = 0, nShifted = nMask, a = []; nFlag < 32;
           nFlag++, a.push(nShifted >>> 31), nShifted <<= 1);

      return a;
    },

    crc32: checksumable.crc32,

    ngrams (sequence, n, startSymbol, endSymbol) {
      var result = [];

      if (!_(sequence).isArray()) {
          sequence = mimir.tokenize(sequence);
      }

      var count = _.max([0, sequence.length - n + 1]);

      // Check for left padding
      if(typeof startSymbol !== "undefined" && startSymbol !== null) {
          // Create an array of (n) start symbols
          var blanks = [];
          for(var i = 0 ; i < n ; i++) {
              blanks.push(startSymbol);
          }

          // Create the left padding
          for(var p = n - 1 ; p > 0 ; p--) {
              // Create a tuple of (p) start symbols and (n - p) words
              result.push(blanks.slice(0, p).concat(sequence.slice(0, n - p)));
          }
      }

      // Build the complete ngrams
      for (var i = 0; i < count; i++) {
          result.push(sequence.slice(i, i + n));
      }

      // Check for right padding
      if(typeof endSymbol !== "undefined" && endSymbol !== null) {
          // Create an array of (n) end symbols
          var blanks = [];
          for(var i = 0 ; i < n ; i++) {
              blanks.push(endSymbol);
          }

          // create the right padding
          for(var p = n - 1 ; p > 0 ; p--) {
              // Create a tuple of (p) start symbols and (n - p) words
              result.push(sequence.slice(sequence.length - p, sequence.length).concat(blanks.slice(0, n - p)));
          }
      }

      return result;
    }
  }
});

var Hash   = checksumable.static({Sim: similarityable});
Hash.Sim.table = checksumable.table();
