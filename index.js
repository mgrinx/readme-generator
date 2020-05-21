"use strict"

import axios from "axios"
import inquirer from "inquirer"
import Rx from "rxjs"
import { writeFile } from "fs"

try {

//response object
const res = { }
//answer handler object
let handle

//formatter to remove count numbers from question names
const f =v=> v.name.split(":")[0]

//callbacks object
const cbs = {
    next: value=>(handle[f(value)] || handle.default)(value),
    error: error=>{ throw error },
    complete: ()=>{
        console.log(JSON.stringify(res))
    }//TODO:add code to write to readme.md
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
        switch(this.groups[this.index].done) {
            //TODO:expand functionality
            case "wait":
                break
            case "next":
                this.next()
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
                    message: "Repo name:"
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
                    name: "badges",
                    type: "confirm",
                    message: "Add badges?"
                }
            ],
            done: "next"
        },
    ],
}

//define handlers
handle = {
    default: v=>{ res[f(v)] = res[f(v)] || v.answer },

    plurals: [
        "feature"
    ],

    populatePlurals(str) {
        for(let p of this.plurals) {
            res[p+"s"] = []
            this[p] = v=>res[f(v)+"s"].push(v.answer)
        }
    },

    //special handlers
    addFeatureList: v=>v.answer ? groups.next() : groups.skip(),
    addFeature: v=>v.answer ? groups.repeat() : groups.next()
}

handle.populatePlurals()
questions.next()

} catch (err) {
    console.error(err)
    process.exit(1)
}