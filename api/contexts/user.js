class interactionContext {
    #page

    constructor(comment_xpaths, page) {
        this.#page = page

        this.score = comment_xpaths.score
        this.text = comment_xpaths.text
        this.permalink = comment_xpaths.permalink
        //this.upvoted = !comment_xpaths.upvote_path
        //this.downvoted = !comment_xpaths.downvote_path
        this.raw_xpaths = {
            full_path: comment_xpaths.entire_path,
            top_path: comment_xpaths.entry_path,
            upvote_path: comment_xpaths.upvote_path,
            downvote_path: comment_xpaths.downvote_path,
        }
    }

    upvote() {
        return new Promise(async (resolve, reject) => {
            try {
                const elements = await this.#page.$x(this.raw_xpaths.upvote_path)
                if(elements[0]){
                    await elements[0].click()
                }

                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    downvote() {
        return new Promise(async (resolve, reject) => {
            try {
                const elements = await this.#page.$x(this.raw_xpaths.downvote_path)
                if(elements[0]){
                    await elements[0].click()
                }

                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }
}

module.exports = class {
    #page = {}
    #parent = {}
    #extra = {}
    #browser = {}

    constructor(page, parent, extra, browser) {
        this.#page = page
        this.#parent = parent
        this.#extra = extra
        this.#browser = browser
    }

    async advanceInteractionPage() {
        return new Promise(async (resolve, reject) => {
            try {
                let advanceButton = await this.#page.waitForSelector(".next-button").catch(reject)
                await advanceButton.click().catch(reject)

                await this.#page.waitForNavigation({waitUntil: "networkidle2"}).catch(reject)
                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async retreatInteractionPage() {
        return new Promise(async (resolve, reject) => {
            try {
                let retreatButton = await this.#page.waitForSelector(".prev-button").catch(reject)
                await retreatButton.click().catch(reject)
                
                await this.#page.waitForNavigation({waitUntil: "networkidle2"}).catch(reject)
                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    fetchInteractions() {
        return new Promise(async (resolve, reject) => {
            try {
                let formattedResult = []
                let topInteractions = await this.#page.evaluate(() => {
                    function XExtract(elm) {
                        var allNodes = document.getElementsByTagName('*');
                        for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) {
                            if (elm.hasAttribute('id')) {
                                var uniqueIdCount = 0;
                                for (var n = 0; n < allNodes.length; n++) {
                                    if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++;
                                    if (uniqueIdCount > 1) break;
                                };
                                if (uniqueIdCount == 1) {
                                    segs.unshift('id("' + elm.getAttribute('id') + '")');
                                    return segs.join('/');
                                } else {
                                    segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
                                }
                            } else if (elm.hasAttribute('class')) {
                                segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]');
                            } else {
                                for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
                                    if (sib.localName == elm.localName) i++;
                                };
                                segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');
                            };
                        };
                        return segs.length ? '/' + segs.join('/') : null;
                    };

                    function sBC(parent, Class) {
                        for (let child of parent.children) {
                            let classNames = child.className.split(" ")
                            if (classNames.includes(Class)) {
                                return child
                            }
                        }
                    }

                    function rSBC(parent, classes) {
                        let result = sBC(parent, classes[0]);
                        for (let i = 1; i < classes.length; i++) {
                            result = sBC(result, classes[i])
                        }

                        return result
                    }

                    function commentFromRaw(raw_interaction) {
                        let score = rSBC(raw_interaction, [`entry`, `tagline`, `score`])
                        let text = rSBC(raw_interaction, [`entry`, `usertext`, `usertext-body`, `md`]).children[0]
                        let permalink = rSBC(raw_interaction, [`entry`, `buttons`, `first`, `bylink`])

                        return {
                            entire_path: XExtract(raw_interaction),
                            entry_path: XExtract(sBC(raw_interaction, `entry`)),

                            upvote_path: XExtract(sBC(raw_interaction, `midcol`).children[0]),
                            downvote_path: XExtract(sBC(raw_interaction, `midcol`).children[1]),
                            text: text.innerText,
                            score: parseInt(score.innerText),
                            permalink: permalink.href,
                        }
                    }

                    let raw_interactions = Array.from(document.querySelectorAll(`.sitetable > .thing`))
                    let result = []

                    for (let raw_interaction of raw_interactions) {
                        if(rSBC(raw_interaction, [`entry`, `tagline`])){
                            result.push(commentFromRaw(raw_interaction))
                        }
                    }

                    return result
                }).catch(reject)

                for (let comment_xpaths of topInteractions) {
                    let formattedComment = new interactionContext(comment_xpaths, this.#page)
                    formattedResult.push(formattedComment)
                }

                resolve(formattedResult)
            } catch (err) {
                reject(new Error(err))
            }
        })
    }
}