let postContext = require("./post.js")
let subredditContext = require("./subreddit.js")
let userContext = require("./user.js")

async function text(el) {
    return await el.evaluate(e => e.innerText.trim())
}

module.exports = class {
    #page = {}
    #parent = {}
    #extra = {}
    #browser = {}
    currentAccount = {}

    constructor(page, parent, extra, browser) {
        this.#page = page
        this.#parent = parent
        this.#extra = extra
        this.#browser = browser
    }

    setup() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#page.goto(`https://old.reddit.com/`)
                let el = await Promise.race([
                    this.#page.waitForSelector(`.user > a`),
                    this.#page.waitForSelector(`#login_login-main > input[type="text"]`),
                ])

                let usernameBox = (await this.#page.$$(`#login_login-main > input[type="text"]`))[0]
                let currentUsername

                if (!usernameBox) {
                    currentUsername = await text(el)
                }

                if (usernameBox) {
                    this.currentAccount = {
                        username: "",
                        password: "",
                        cookies: [],
                        formatted_cookies: "",
                        loggedIn: false,
                    }
                } else {
                    let currentCookies = await this.#parent.getCookies()

                    this.currentAccount = {
                        username: currentUsername,
                        password: "",
                        cookies: currentCookies,
                        formatted_cookies: await this.#parent.getFormattedCookies(),
                        loggedIn: true,
                    }
                }

                resolve(this.currentAccount)
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async navigatePost(subreddit, id) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#page.goto(`https://old.reddit.com/r/${subreddit}/comments/${id}/`).catch(reject)

                await Promise.race([
                    this.#page.waitForSelector(`#classy-error`),
                    this.#page.waitForSelector(`a.title`),
                ]).catch(reject)

                const navigate_error = await this.#page.$(`#classy-error`)

                if (navigate_error) {
                    return reject("Invalid post")
                }

                resolve()
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async navigatePost(subreddit, id) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#page.goto(`https://old.reddit.com/r/${subreddit}/comments/${id}/`).catch(reject)

                await Promise.race([
                    this.#page.waitForSelector(`#classy-error`),
                    this.#page.waitForSelector(`a.title`),
                ]).catch(reject)

                const navigate_error = await this.#page.$(`#classy-error`)

                if (navigate_error) {
                    return reject("Invalid post")
                }

                let newContext = new postContext(this.#page, this, this.#extra, this.#browser);
                resolve(newContext)
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async navigateUser(user) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#page.goto(`https://old.reddit.com/user/${user}/`).catch(reject)

                await Promise.race([
                    this.#page.waitForSelector(`#classy-error`),
                    this.#page.waitForSelector(`.side > .spacer > .titlebox`),
                ]).catch(reject)

                const navigate_error = await this.#page.$(`#classy-error`)

                if (navigate_error) {
                    return reject("Invalid user")
                }
                
                let newContext = new userContext(this.#page, this, this.#extra, this.#browser);
                resolve(newContext)
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async navigateSubreddit(subreddit, searchType = "hot") {
        return new Promise(async (resolve, reject) => {
            try {
                await this.#page.goto(`https://old.reddit.com/r/${subreddit}/${searchType}/`, {waitUntil: "networkidle2"}).catch(reject)
                const url = await this.#page.url()

                if (!url || url?.includes("/search?q=")) {
                    return reject("Invalid subreddit")
                }

                let newContext = new subredditContext(this.#page, this, this.#extra, this.#browser);
                resolve(newContext)
            } catch (err) {
                reject(new Error(err))
            }
        })
    }

    async login(accountInfo = {}, cookies) {
        return new Promise(async (resolve, reject) => {
            try {
                let el

                if (typeof cookies == "string" || typeof cookies == "object") {
                    await this.#parent.clearCookies().catch(reject)
                    await this.#parent.setCookies(cookies).catch(reject)
                    await this.#page.reload({ waitUntil: "networkidle2" }).catch(reject)

                    el = await Promise.race([
                        this.#page.waitForSelector(`.user > a`),
                        this.#page.waitForSelector(`#login_login-main > input[type="text"]`),
                    ]).catch(reject)
                }

                let usernameBox = (await this.#page.$$(`#login_login-main > input[type="text"]`).catch(reject))[0]
                let currentUsername

                if (!usernameBox) {
                    currentUsername = await text(el)
                }

                if (usernameBox || (currentUsername !== accountInfo.username && accountInfo.username)) {
                    if (!accountInfo.username || !accountInfo.password) {
                        this.#browser.emit("loginFailed", this.#parent.id, {
                            header: "No account information given",
                            instructions: "Please provide both username and password for the account",
                        })

                        reject("No account information given")
                    }

                    await this.#parent.clearCookies().catch(reject)
                    await this.#page.reload().catch(reject)
                    await this.#page.waitForSelector(`#login_login-main > input[type="text"]`).catch(reject)

                    // username

                    await this.#page.click(`#login_login-main > input[type="text"]`).catch(reject)
                    await this.#page.type(`#login_login-main > input[type="text"]`, accountInfo.username, { delay: 75 }).catch(reject)

                    // password

                    await this.#page.click(`#login_login-main > input[type="password"]`).catch(reject)
                    await this.#page.type(`#login_login-main > input[type="password"]`, accountInfo.password, { delay: 75 }).catch(reject)

                    await this.#page.click(`#login_login-main > #remember-me > #rem-login-main`);
                    await this.#page.click(`#login_login-main > .submit > .btn`);

                    await Promise.race([
                        this.#page.waitForNavigation({ waitUntil: "networkidle2" }),
                        this.#page.waitForSelector(`#login_login-main > .error`),
                    ]).catch(reject)

                    const login_error = await this.#page.$(`#login_login-main > .error`)

                    if (login_error) {
                        this.#browser.emit("loginFailed", this.#parent.id, {
                            header: "wrong password or username",
                            instructions: await text(login_error),
                        })

                        return reject(await text(login_error))
                    }

                    this.currentAccount = {
                        ...accountInfo,
                        cookies: await this.#parent.getCookies().catch(reject),
                        formatted_cookies: await this.#parent.getFormattedCookies().catch(reject),
                        loggedIn: true,
                    }

                    resolve(this.currentAccount)
                } else {
                    this.currentAccount = {
                        username: currentUsername,
                        password: "",
                        cookies: await this.#parent.getCookies().catch(reject),
                        formatted_cookies: await this.#parent.getFormattedCookies().catch(reject),
                        loggedIn: true,
                    }
                }

                resolve(this.currentAccount)
            } catch (err) {
                reject(new Error(err))
            }

        })
    }
}