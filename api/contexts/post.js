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
                let topComments = await this.#page.evaluate(() => {
                    function createXPathFromElement(elm) { 
                        var allNodes = document.getElementsByTagName('*'); 
                        for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) 
                        { 
                            if (elm.hasAttribute('id')) { 
                                    var uniqueIdCount = 0; 
                                    for (var n=0;n < allNodes.length;n++) { 
                                        if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++; 
                                        if (uniqueIdCount > 1) break; 
                                    }; 
                                    if ( uniqueIdCount == 1) { 
                                        segs.unshift('id("' + elm.getAttribute('id') + '")'); 
                                        return segs.join('/'); 
                                    } else { 
                                        segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]'); 
                                    } 
                            } else if (elm.hasAttribute('class')) { 
                                segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]'); 
                            } else { 
                                for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) { 
                                    if (sib.localName == elm.localName)  i++; }; 
                                    segs.unshift(elm.localName.toLowerCase() + '[' + i + ']'); 
                            }; 
                        }; 
                        return segs.length ? '/' + segs.join('/') : null; 
                    }; 

                    function searchChildByClass(parent, Class){
                        for(let child of parent.children){
                            let classNames = child.className.split(" ")
                            if(classNames.includes(Class)){
                                return child
                            }
                        }
                    }

                    let raw_comments = Array.from(document.querySelectorAll(`.nestedlisting > .comment`))
                    let result = []

                    for(let raw_comment of raw_comments){
                        let vote_element = searchChildByClass(raw_comment, `midcol`)
                        let like_element = searchChildByClass(vote_element, `up`)
                        let dislike_element = searchChildByClass(vote_element, `down`)

                        result.push({
                            like_path: createXPathFromElement(like_element),
                            dislike_path: createXPathFromElement(dislike_element),
                        })
                    }

                    return result
                }).catch(reject)

                console.log(topComments)
            } catch (err) {
                reject(new Error(err))
            }
        })
    }
}