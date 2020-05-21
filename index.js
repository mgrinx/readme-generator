"use strict"

import axios from "axios"
import inquirer from "inquirer"
import Rx from "rxjs"
import { writeFile } from "fs"

//response object
const res = { }
//answer handler object
let handle

//formatter to remove count numbers from question names
const f =v=> v.name.split(":")[0]

//generate the readme
const gen =r=> {
    let badges = ""
    if(r.badges.length>0) {
        for(let v of r.badges) {
            badges += `![${v}](https://img.shields.io/badge/dynamic/json?color=blue&label=${v}&query=%24.dependencies.${v}&url=https%3A%2F%2Fraw.githubusercontent.com%2F${r.user}%2F${r.repo}%2Fmaster%2Fpackage.json)\n`
        }
    }

    let features = ""
    if(r.features.length>0) {
        for(let v of r.features) {
            features += `- ${v}\n`
        }
    }

    let user
    axios.get('https://api.github.com/users/'+r.user, {
        auth: {
            username: r.user,
            password: r.pass
        },
        method: "GET",
    })
    .then((u)=>{
        user = u.data
    })

    let readme =
`# ${r.title}
${r.desc}  

${r.screenshot ? "![Screenshot](Screenshot.png)" : ""}
## Table of Contents
- [Usage](#Usage)
${r.features.length>0 ? "- [Features](#Features)" : ""}
- [Contributors](#Contributors)
- [Dependencies](#Dependencies)
## Usage
${r.usage}
${r.features.length>0 ? "## Features" : ""}
${features}
## Contributors
<iframe src="https://githubbadge.appspot.com/${r.user}" style="border: 0;height: 111px;width: 200px;overflow: hidden;" frameBorder="0"></iframe>

${r.badges.length>0 ? "## Dependencies" : ""}
${badges}
`

    writeFile("./README.md", readme, ()=>{
        console.log("README.md is done!")
        process.exit(0)
    })
}

//callbacks object
const cbs = {
    next: v=>(handle[f(v)] || handle.default)(v),
    error: err=>{ throw err },
    complete: ()=>gen(res)
}

const prompts = new Rx.Subject()
inquirer.prompt(prompts).ui.process.subscribe(cbs.next, cbs.error, cbs.complete)

// question object for moving thru batches of questions at a time
const questions = {
    index: -1,
    next() {
        ++this.index
        if(this.index>this.groups.length-1) {
            return prompts.complete()
        }
        for(let q of this.groups[this.index].body) {
            let { name } = q
            let fq = { ...q }
            fq.name = this.count(name)
            prompts.next(fq)
        }
    },
    repeat() {
        --this.index
        this.next()
    },
    skip() {
        ++this.index
        this.next()
    },
    count(str) {
        //keep count of names since they have to be unique
        this.counts[str] = this.counts[str] || 0
        return str+":"+(++this.counts[str])
    },
    counts: {

    },

    groups: [
        {
            body: [
                {
                    name: "user",
                    type: "input",
                    message: "Github username:"
                },
                {
                    name: "pass",
                    type: "password",
                    message: "Github password:"
                },
                {
                    name: "repo",
                    type: "input",
                    message: "Repo name (exact):"
                },
                {
                    name: "title",
                    type: "input",
                    message: "Title to put in header:"
                },
                {
                    name: "desc",
                    type: "input",
                    message: "Repo description:"
                },
                {
                    name: "screenshot",
                    type: "confirm",
                    message: "Embed image from ./Screenshot.png"
                },
                {
                    name: "usage",
                    type: "input",
                    message: "Explain how to use the repo:"
                },
                {
                    name: "addFeatureList",
                    type: "confirm",
                    message: "Add a list of features?"
                },
            ],
            done: "wait"
        },

        {
            body: [
                {
                    name: "feature",
                    type: "input",
                    message: "Enter feature:"
                },
                {
                    name: "addFeature",
                    type: "confirm",
                    message: "Add another feature?"
                },

            ],
            done: "wait"
        },

        {
            body: [
                {
                    name: "addBadgeList",
                    type: "confirm",
                    message: "Add badges?"
                }
            ],
            done: "wait"
        },

        {
            body: [
                {
                    name: "badge",
                    type: "input",
                    message: "Enter dependency name:"
                },
                {
                    name: "addBadge",
                    type: "confirm",
                    message: "Add another badge?"
                },

            ],
            done: "next"
        },
    ],
}

//define handlers
handle = {
    default: v=>{ res[f(v)] = res[f(v)] || v.answer },

    plurals: [
        "feature",
        "badge"
    ],

    populatePlurals() {
        for(let p of this.plurals) {
            res[p+"s"] = [] //add array to reponse object to hold multiple answers
            this[p] = v=>res[f(v)+"s"].push(v.answer) //add basic plural handler
        }
    },

    //special handlers
    addFeatureList: v=>v.answer ? questions.next() : questions.skip(),
    addFeature: v=>v.answer ? questions.repeat() : questions.next(),
    addBadgeList: v=>v.answer ? questions.next() : questions.skip(),
    addBadge: v=>v.answer ? questions.repeat() : questions.next()
}

handle.populatePlurals()
questions.next()