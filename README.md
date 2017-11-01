# PFQL - Protein Feature Query Language
[![Build Status](https://travis-ci.org/biowonks/pfql.svg?branch=master)](https://travis-ci.org/biowonks/pfql)
[![Coverage Status](https://coveralls.io/repos/github/biowonks/pfql/badge.svg?branch=master)](https://coveralls.io/github/biowonks/pfql?branch=master)

PFQL is a flexible feature querying language for proteins. By feature we mean anything that can be identified in a protein sequence: transmembrane regions, domain models, signal peptides, low complex regions and more.

It works by inserting the field `PFQLMatches` with the value of an array with the indexes of the matching definitions.

## Install
```
$ npm install pfql
```

## Usage

Example of sets of rules:
```javascript
let query = [
    {
        rules: [
            {
                Npos: [
                    {
                    resource: 'pfam28',
                    feature: 'MCPsignal'
                    }
                ]
            }
        ]
    }
]
```

example of input data (`my_data.json`):
```json
[
  {
     "t": {
        "das": [
           ["TM",14,31],
           ["TM",60,76]
        ],
        "pfam28": [
           ["MCPsignal",192,381]
        ],
     }
  }
]
```

Then you can use as a service:

```javascript
let pfql = require('pfql')

let sampleData = require('./my_data.json')

let pfqlService = new pfql.PFQLService(query)
pfqlService.initRules()

sampleData.forEach(function(item) {
    console.log(pfqlService.findMatches(item))
})
```

Or use it as a stream
```javascript
let pfql = require('pfql')
let pfqlStream = new pfql.PFQLStream(query)

fs.createReadStream('my_data.json')
    .pipe(pfqlStream)
    .on('data', function(item) {
        console.log(item.FQLMatches)
    })
```

## Understanding the fundamentals of PFQL

### Searching the protein universe with Domain architecture

It is our hypothesis that a more accurate search in the protein universe for members of a particular protein family can be achieved by searching based on protein features, in particular based on protein domains. As the accuracy, coverage and overall quality of protein domain models in several databases, prediction tools such as transmembrane region, we expect that defining protein families based on protein domains will be the ultimate method used in the future.

PFQL exposes two classes: PFQLStream and PFQLService

The PFLQStream is a `Transform` stream that wraps the PFQLService for convenience. The constructor takes a set of matching rules that should describe the protein family of interest. For example, if the protein family of interest is the chemotaxis scaffold CheW, a possible rule would be `match all sequences that has only one CheW domain, as defined by Pfam 30 database`. In reality, the `FQLStream` can process multiple protein families definitions at once and therefore, the constructor takes an array of set of matching rules, each set for protein family. The output is the same information as the input plus a field `FQLMatches` with the indexes of the set of rules that this particular protein matches.

To learn more about how to setup rules, check out the [manual](manual.md)