let reddit = require("./contexts/reddit.js")

const uuid = require("uuid")
const to = require("await-to-js").default

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

module.exports = class {
    page = {}
    #extra = {}
    #browser = {}
    videoInfo = {}
    CDPSession = {}
    id = uuid.v4();
    cookies = ""

    constructor(page, extra, browser) {
        this.page = page
        this.#extra = extra
        this.#browser = browser
    }

    setupReddit() {
        return new Promise(async (resolve, reject) => {
            let redditContext = this.createRedditContext()
            await redditContext.setup().catch(reject)

            resolve(redditContext)
        })
    }

    createRedditContext() {
        let context = new reddit(this.page, this, this.#extra, this.#browser)
        return context
    }

    close() {
        return new Promise(async (resolve, reject) => {
            this.page.close().catch(reject).then(resolve)
        })
    }

    getCookies() {
        return new Promise(async (resolve, reject) => {
            let raw_cookies_full = (await this.CDPSession.send('Network.getAllCookies').catch(reject)).cookies
            let raw_cookies = await this.page.cookies().catch(reject)
            let cookies = raw_cookies
            //let cookies = [...raw_cookies, ...raw_cookies_full]

            let result = []
            let blacklist = [
                "ACCOUNT_CHOOSER",
                "LSID"
            ]

            for (let cookie of cookies) {
                if (!blacklist.includes(cookie.name)) {
                    result.push(cookie)
                }
            }

            resolve(cookies)
        })
    }

    async getFormattedCookies(existing) {
        return new Promise(async (resolve, reject) => {
            let raw_cookies = existing || await this.getCookies().catch(reject)

            let cookies = ""

            for (let [index, cookie] of raw_cookies.entries()) {
                if (cookie.value && cookie.name && cookie.name.length > 0 && cookie.value !== "undefined") {
                    if (index < raw_cookies.length - 1) {
                        cookies += `${cookie.name}=${cookie.value}; `
                    } else {
                        cookies += `${cookie.name}=${cookie.value}`
                    }
                }
            }

            resolve(cookies)
        })
    }

    async setCookies(cookies) {
        return new Promise(async (resolve, reject) => {
            if (typeof cookies == "string") {
                try {
                    cookies = JSON.parse(cookies)
                } catch (err) {
                    cookies = cookies.split("; ")
                    let res = []

                    for (let cookie of cookies) {
                        let parts = cookie.split("=")
                        let name = parts.shift()
                        let value = parts.join("=")
                        res.push({
                            name,
                            value,
                            domain: ".google.com",
                            path: "/",
                            expires: Date.now() + 657000000,
                            size: name.length + value.length,

                            httpOnly: false,
                            secure: true,
                            sesion: false,
                            sameSite: "None",
                            sameParty: false,
                            sourceScheme: "Secure",
                            sourcePort: 443,
                        })
                    }

                    cookies = res
                }
            } else {
                cookies = cookies.map((v) => {return {
                    name: v.name,
                    value: v.value,
                    domain: v.domain,
                    path: v.path,
                    expires: v.expires,
                    size: v.size,

                    httpOnly: v.httpOnly,
                    secure: v.secure,
                    sesion: v.sesion,
                    sameSite: v.sameSite,
                    sameParty: v.sameParty,
                    sourceScheme: v.sourceScheme,
                    sourcePort: v.sourcePort,
                }})
            }


            this.cookies = await this.getFormattedCookies(cookies).catch(reject)
            await this.CDPSession.send("Network.setCookies", { cookies: cookies }).catch(reject)

            resolve()
        })
    }

    async clearCookies() {
        return new Promise(async (resolve, reject) => {
            await this.CDPSession.send('Network.clearBrowserCookies').catch(reject)
            resolve()
        })
    }
}