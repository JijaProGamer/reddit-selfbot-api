class commentContext {
    #page

    constructor(comment_xpaths, page) {
        this.#page = page

        this.score = comment_xpaths.score
        this.author = comment_xpaths.author
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

        this.children = []

        for(let child of comment_xpaths.children){
            this.children.push(new commentContext(child, page))
        }
    }

    upvote() {
        return new Promise(async (resolve, reject) => {
            try {
                const elements = await this.#page.$x(this.raw_xpaths.upvote_path).catch(reject)
                if(elements[0]){
                    await elements[0].click().catch(reject)
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
                const elements = await this.#page.$x(this.raw_xpaths.downvote_path).catch(reject)
                if(elements[0]){
                    await elements[0].click().catch(reject)
                }

                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    /*async comment(message) {
        return new Promise(async (resolve, reject) => {
            try {
                let em = await this.#page.waitForSelector(`.commentarea > form > .usertext-edit > .md > textarea`).catch(reject)
                await em.click().catch(reject)

                await this.#page.keyboard.type(message, 25).catch(reject)

                let submit = await this.#page.waitForSelector(`.usertext-buttons > .save`).catch(reject)
                await submit.click().catch(reject)
                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }*/
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

    async upvote() {
        return new Promise(async (resolve, reject) => {
            try {
                let em = await this.#page.waitForSelector(`#siteTable > div > .midcol > .up`).catch(reject)
                await em.click().catch(reject)

                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async downvote() {
        return new Promise(async (resolve, reject) => {
            try {
                let em = await this.#page.waitForSelector(`#siteTable > div > .midcol > .down`).catch(reject)
                await em.click().catch(reject)

                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async comment(message) {
        return new Promise(async (resolve, reject) => {
            try {
                let em = await this.#page.waitForSelector(`.commentarea > form > .usertext-edit > .md > textarea`).catch(reject)
                await em.click().catch(reject)

                await this.#page.keyboard.type(message, 25).catch(reject)

                let submit = await this.#page.waitForSelector(`.usertext-buttons > .save`).catch(reject)
                await submit.click().catch(reject)
                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async fetchComments() {
        return new Promise(async (resolve, reject) => {

            try {
                let formattedResult = []
                let topComments = await this.#page.evaluate(() => {
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

                    function commentFromRaw(raw_comment) {
                        let author = rSBC(raw_comment, [`entry`, `tagline`, `author`])
                        let score = rSBC(raw_comment, [`entry`, `tagline`, `score`])
                        let text = rSBC(raw_comment, [`entry`, `usertext`, `usertext-body`, `md`]).children[0]

                        let children = []
                        let children_elements = rSBC(raw_comment, [`child`, `sitetable`])

                        if (children_elements) {
                            for (let children_element of children_elements.children) {
                                if (children_element.className.split(" ").includes("comment")) {
                                    children.push(commentFromRaw(children_element))
                                }
                            }
                        }

                        return {
                            entire_path: XExtract(raw_comment),
                            entry_path: XExtract(sBC(raw_comment, `entry`)),

                            //comment_path: rSBC(raw_comment, [`entry`, `buttons`, `reply-button`, `access-required`]),
                            upvote_path: XExtract(sBC(raw_comment, `midcol`).children[0]),
                            downvote_path: XExtract(sBC(raw_comment, `midcol`).children[1]),
                            text: text.innerText,
                            author: author.innerText,
                            score: score ? parseInt(score.innerText): 0,
                            children: children,
                            permalink: raw_comment.getAttribute("data-permalink"),
                        }
                    }

                    let raw_comments = Array.from(document.querySelectorAll(`.nestedlisting > .comment`))
                    let result = []

                    for (let raw_comment of raw_comments) {
                        result.push(commentFromRaw(raw_comment))
                    }

                    return result
                }).catch(reject)

                for (let comment_xpaths of topComments) {
                    let formattedComment = new commentContext(comment_xpaths, this.#page)
                    formattedResult.push(formattedComment)
                }

                resolve(formattedResult)
            } catch (err) {
                reject(new Error(err))
            }
        })
    }
}