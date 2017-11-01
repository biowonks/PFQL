# PFQL Manual

> This manual is under construction.

## Understanding the fundamentals of PFQL

PFQL is a flexible feature querying language for proteins that is based in a filtering mechanism. By feature we call anything that can be identified in a protein sequence: transmembrane regions, domain models, signal peptides, low complex regions and more.

### What is domain architecture ? (to do)

* Sequence definition of a protein domain
* Other features that are not domain but it is part of the domain architecture of a protein - TM, low complexity, signalP.
* Comprehensive domain architecture definition

### Searching the protein universe with Domain architectures. (to do)

* domain definitions are getting better and in the future might be able to cover
* easy and simple way to query extensive databases - variable specificity
* multi-domain proteins
* pitfalls

### Simple use of PFQL

PFQL was built to be used as a `Transform` stream. The constructor takes a set of matching rules that should describe the protein family of interest. For example, if the protein family of interest are the chemotaxis scaffold CheW, a possible rule would be `match all sequences that has only one CheW domain, as defined by Pfam 30 database`. In reality, the `PFQLStream` can process multiple protein families definitions at once and therefore, the constructor takes an array of set of matching rules, each set for protein family. The output is the same information as the input plus a field `PFQLMatches` with the indexes of the set of rules that this particular protein matches.

The readable stream pushing objects like these:

It reads objects and adds the field

```json
[
  {
    "t": {
      "resource1": [
        ["feature",start, stop],
        ["feature2",start, stop],
      ],
      "resource2": [
        ["feature",start, stop],
      ],
    }
  }
]
```

A real example of an input with domain architecture information about pfam28, smart and transmembrane predictions by das and TMHMM is:

```json
[
  {
    "t": {
      "das": [
        ["TM",14,31,21,4.055,0.0003693],
        ["TM",60,76,66,3.958,0.0005206]
      ],
      "pfam28": [
        ["MCPsignal",192,381,"..",26.8,4,207,".]",186,381,"..",195.8,3.5e-61,3.9e-58,0.96]
      ],
      "smart": [
        ["SM00283",135,382,1.3e-81]
      ],
      "tmhmm": [
        ["TM",16,38],["TM",60,82]
      ]
    }
  }
]
```

Notice that we name the feature `TM` in the transmembrane predictions, so we can use to make rules about this feature later. We will talk about how to setup these rules later.

Before we actually give an example of how to use `PFQLStream`, we will give a quick example on how to use the `PFQLService` which is the heart and soul of the PFQL system.

#### Using PFQLService (not recommended)

Suppose the input items are stored in an `json` file `my_data.json`. The following code process each object, adds the information about matches to each item of the data and prints the object in the console.

The rule in this case is any protein that starts with a CheW domain as defined by the pfam28 database.

```javascript
let pfql = require('pfql')

let sampleData = [
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
let query = [
    {
        rules:  [
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

let pfqlService = new pfql.PFQLService([query])
pfqlService.initRules()

sampleData.forEach(function(item) {
    console.log(pfqlService.findMatches(item))
})
```

#### Using PFQLStream

The same effect can be achieved with `PFQLStream`.

```javascript
let pfql = require('pfql')
let pfqlStream = new pfql.PFQLStream(query)

fs.createReadStream('my_data.json')
    .pipe(pfqlStream)
    .on('data', function(item) {
        console.log(item.FQLMatches)
    })
```

### Rules in PFQL

In PFQL, there are two types of rules: **non-positional** and **positional**. The first one allows you to select sequences by simple presence or abscence of features. The second one, more elaborated, allows you to be more specific and pass the order in which the domains should appear.

The rules are passed as a JSON object to PFQL and it has two keys: `Npos` for non-positional rules and `pos` for positional rules. None of these keys are mandatory and PFQL will return `true` match to any sequence if rules are an empty object. Other keys will be ignored. PQFL will throw an `Error` if the constructor receives no rules.

The organization of PFQL rules obeys the following structure:

* query - Array containing collections of sets of rules for a single protein family.
    * collections of sets of rules - Object containing sets of rules under the key `rules`.
        * sets of rules - Array containing objects with positional and non-positional rules that must match
            * set of rules - Object containing rule under the key `pos` and `Npos`.
                * rule - set of instructions that must match.
                    * instruction - single snippet of matching definition.

Example of a simple query containing 1 protein family definition:

```javascript
let setsOfRules = [ // query
    { //collection of rules
        rules: [ //sets of rules
            { //set of rules
                pos: [ //rule
                    { //instruction
                        resource: 'fql',
                        feature: '^'
                    },
                    {
                        resources: 'pfam28',
                        feature: 'CheW'
                    },
                ]
            }
        ]
    }
]
```

Example of a more complex query containing 3 protein family definitions:

```javascript
let setsOfRules = [ //query
    { //collection of rules for protein 1
        rules: [ //sets of rules
            { //set of rules
                pos: [ // rule
                    { // instruction
                        resource: 'pfam28',
                        feature: 'CheW'
                    }
                ]
            }
        ]
    },
    { //collection of rules for protein 2
        rules:  [ //sets of rules
            { // set of rules
                pos: [ // rule
                    { // instruction
                        resource: 'fql',
                        feature: '^'
                    },
                    { // instruction
                        resource: 'das',
                        feature: 'TM',
                        count: '{1}'
                    },
                    { // instruction
                        resource: 'pfam28',
                        feature: '.*',
                        count: '{1,}'
                    },
                    { // instruction
                        resource: 'das',
                        feature: 'TM',
                        count: '{1}'
                    },
                    { // instruction
                        resource: 'pfam28',
                        feature: '.*',
                        count: '{1,}'
                    },
                    { // instruction
                        resource: 'pfam28',
                        feature: 'MCPsignal',
                        count: '{1}'
                    },
                    { // instruction
                        resource: 'fql',
                        feature: '$'
                    }
                ]
            }
        ]
    },
    { //collection of rules for protein 3
        rules: [ // sets of rules
            { // set of rules 1
                pos: [ // rule
                    { // instruction
                        resource: 'fql',
                        feature: '^'
                    },
                    { // instruction
                        resource: 'pfam28',
                        feature: '.*',
                        count: '{2}'
                    },
                    { // instruction
                        resource: 'fql',
                        feature: '$'
                    }
                ]
            },
            { // set of rules 2
                pos: [ // rule 1
                    { // instruction
                        resource: 'fql',
                        feature: '^'
                    },
                    { // instruction
                        resource: 'das',
                        feature: 'TM',
                        count: '{2}'
                    }
                ],
                Npos: [ // rule 2
                    { // instruction
                        resource: 'pfam28',
                        feature: 'HAMP'
                    }
                ]
            },
        ]
    }
]
```

#### What's the reason behind the key `rules`?

We may want to keep the metadata related to that particular collection of sets of rules. To accommodate that request, we included sets of rules in an object under the key `rules`. We now can store related metadata under other keys such as `meta`.


Let's explore the types of rules:

#### The **non-positional** rules

Non-positional rules are easy. You just need to tell PFQL the feature you want (or don't want) in your domain architecture. For example:

If you want to select all sequences with any number of matches to the CheW domain from the Pfam28 database:

```javascript
[
    {
        "Npos": [
            {
                resource: "pfam28"
                feature: "CheW"
            }
        ]
    }
]
```

If you want to define how many times the domain must appear, you can use the key `count`. For example:

If you want to select all sequences with at least only one matches to the CheW domain from the Pfam28 database:

```javascript
[
    {
        "Npos": [
            {
                resource: "pfam28"
                feature: "CheW",
                count: '{1}'
            }
        ]
    }
]
```

Notice that the *value* in `count` is between curly brackets and it is a `string`. This is because PFQL borrows from the Regular Expression the notation for quantifiers which allows to not pass only numbers but also intervals. For example:

If you want to select all sequences with 1, 2 or 3 matches to the CheW domain from the Pfam28 database:

```javascript
[
    {
        "Npos": [
            {
                resource: "pfam28"
                feature: "CheW",
                count: '{1,3}'
            }
        ]
    }
]
```

If you want to select all sequences with 2 or more matches to the CheW domain from the Pfam28 database:

```javascript
[
    {
        "Npos": [
            {
                resource: "pfam28"
                feature: "CheW",
                count: '{2,}'
            }
        ]
    }
]
```

Note that as in regular experession, PFQL also does not include support for *no more than*. Instead you can use `{1,4}` to indicate presence and no more than 4 matches.

The last important issue to know about **non-positional** rules in PFQL is that you can add rules to the `Npos` array of objects and they all must match. It is a `AND` type of association. For example:

If you want to select all sequences with at least 1 match to CheW domain in pfam28 AND only 1 match to HATPase_c domain in pfam28:

```javascript
[
    {
        "Npos": [
            {
                resource: "pfam28"
                feature: "CheW",
                count: '{1,}'
            },
            {
                resource: "pfam28"
                feature: "HATPase_c",
                count: '{1}'
            }
        ]
    }
]
```

Requirements for abscence of certain feature can be passed here as well by using `{0}`. For example:

If you want to select all sequences with at least 1 match to CheW domain in pfam28 AND only 1 match to HATPase_c domain in pfam28 AND NO matches to `Response_reg` in pfam28:

```javascript
[
    {
        "Npos": [
            {
                resource: "pfam28"
                feature: "CheW",
                count: '{1,}'
            },
            {
                resource: "pfam28"
                feature: "HATPase_c",
                count: '{1}'
            },
            {
                resource: "pfam28"
                feature: "Response_reg",
                count: '{0}'
            }
        ]
    }
]
```

You can also pass alternative rules. For that you need a new object in the *set of rules*. For example:

If you want to select all sequences with at least 2 match to CheW domain in pfam28 OR only 1 match to HATPase_c domain in pfam28:

```javascript
[
    {
        Npos: [
            {
                resource: 'pfam28',
                feature: 'CheW',
                count: '{2,}'
            }
        ]
    },
    {
        Npos: [
            {
                resource: 'pfam28',
                feature: 'HATPase_c',
                count: '{1}'
            }
        ]
    }
]
```

Finally, PFQL allows the use of the wild card `.*`. **Don't mistake `.*` for `*`** in the `resource` field. For example:

Match proteins with 1 domain from pfam28:

```javascript
[
    {
        Npos: [
            {
                resource: 'pfam28',
                feature: '.*',
                count: '{1}'
            }
        ]
    }
]
```

#### The **positional** rules

Positional rules are a bit more complicated and highly based on regular expression. It can also mimic some behavior of non-positional rules as we will see it later.

For example, to accomplish the same result as for to select all sequences with only one matches to the CheW domain from the Pfam28 database using positonal rules we have:

```javascript
[
    {
        pos: [
            {
                resource: 'pfam28',
                feature: 'CheW'
            }
        ]
    }
]
```

To allow for complex definitions, PFQL borrows `^` from the *Regular Expression* lexicon to determine the N-terminus of the sequence and `$` the C-terminus.

For example: to match sequences with **only** **1** match to a CheW domain from Pfam28 and nothing else.

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'pfam28',
                feature: 'CheW'
            }
            {
                resource: 'fql',
                feature: '$'
            }
        ]
    }
]
```

This is different from a non-positional rule because here no other element of the resources mentioned in the rule is allowed anywhere in the sequence. This will be more important when we discuss `scope of search` in PFQL.

#### Count in positional rule

As in **non-positional** rules, PFQL can also be used with the key `count`. Note that when using `count` with positional rules the value passed to `count` will be added to the query rule as regular expression quantifier. For example:

For example: to match only sequences with `CheW - CheW` domain architecture and no other match to the pfam29 database will be selected.

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'pfam29',
                feature: 'CheW',
                count: '{2}'
            }
            {
                resource: 'fql',
                feature: '$'
            }
        ]
    }
]
```

The key `count` can also be used to select a range of number of acceptable repeats of the domain.

For example: to match protein sequences with only 2 or 3 CheWs and nothing else:

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'pfam29',
                feature: 'CheW',
                count: '{2,3}'
            }
            {
                resource: 'fql',
                feature: '$'
            }
        ]
    }
]
```

Another example is to combine these elements: match proteins with 2 or 3 CheW protein domain at the end of the sequence, but allow anything else in the N-terminus:

```javascript
[
    {
        pos: [
            {
                resource: 'pfam29',
                feature: 'CheW',
                count: '{2,3}'
            }
            {
                resource: 'fql',
                feature: '$'
            }
        ]
    }
]
```

Also it is worth notice that the `count` value is very limitant. for example:

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'pfam29',
                feature: 'CheW',
                count: '{2}'
            }
        ]
    }
]
```

will match domain architecture such as CheW-CheW but not CheW-CheW-CheW. To include the last one, you must change the value `count` to `{2,3}`.

If you omit `count`, then any sequence that starts with CheW, independently of the next domain, will be matched.

Wild card `.*` can also be used in positional rules for features:

For example if I want to search for any chemoreceptor (ending with MCPsignal) with one or more of any domains from pfam28 between, and after the two TM regions at the beggining of the sequence, we use:

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            },
            {
                resource: 'pfam28',
                feature: '.*',
                count: '{1,}'
            },
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            },
            {
                resource: 'pfam28',
                feature: '.*',
                count: '{1,}'
            },
            {
                resource: 'pfam28',
                feature: 'MCPsignal',
                count: '{1}'
            },
            {
                resource: 'fql',
                feature: '$'
            }
        ]
    }
]
```

#### Negatives in positional rules and positional AND associations

Before start to work with negatives we must talk about `AND` type of rules for a specific position.

> We did not code `OR` type of association of instructions for each position because it can be accomplished by the association of two entire set of rule, which is already implemented.

So far positional rules was composed by a list of objects each containing an instruction. Now, we will pass several instructions to the same position that MUST be matched in order to be selected.

To do that, each instruction can be passed as a list of instructions which does not make much sense unless we use a negative.

To use negatives, you can use the same type of instruction with the `count` key with `{0}` value.  For example:

Match proteins that starts with a TM region, and in between the two TM regions have any domain but Cache_1 from pfam28.

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            },
            [
                {
                    resource: 'pfam28',
                    feature: 'Cache_1',
                    count: '{0}'
                },
                 {
                    resource: 'pfam28',
                    feature: '.*',
                    count: '{1}'
                }
            ],
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            },
        ]
    }
]
```

#### Combining positional and non-positional rules

#### Scope of search

For each definition in the query, there will be a `scope of search` to allow the use of wild card in the resource field. When PFQL process the rules submited in the constructor, it will collect all the resources used in the sets of rules and only look at them, despite other information might be passed. PFQL will ignore the other information.

Therefore, if we want to match proteins that starts with two TM regions but that in between them, it must have either two orther TM, two domains from pfam28 or one TM and one domain from pfam28, the following rule won't work:

This won't work:

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            },
            {
                resource: '.*',
                feature: '.*',
                count: '{2}'
            },
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            }
        ]
    }
]
```

That is because only `das` has been mentioned as resource. To include pfam28 in the list without altering the pattern, we can include pfam28 as a non-positional requirement:

This works:

```javascript
[
    {
        pos: [
            {
                resource: 'fql',
                feature: '^'
            },
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            },
            {
                resource: '.*',
                feature: '.*',
                count: '{2}'
            },
            {
                resource: 'das',
                feature: 'TM',
                count: '{1}'
            }
        ],
        Npos: [
            {
                resource: 'pfam28',
                feature: '.*',
                count: '{0,}'
            }
        ]
    }
]
```

There are issues that we know of and that we decided to deal with in the next versions of PFQL, some of them are:

* Overlapping features.
