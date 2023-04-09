const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const typeOnKeyboard = async (page, inputText) => {
    return new Promise(async (resolve, reject) => {
        for (let key of inputText.split('')) {
            await page.keyboard.sendCharacter(key).catch(reject)
            await sleep(25)
        }

        resolve()
    })
};

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

    
}