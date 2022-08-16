import DiscordJS, { Intents, Interaction, MessageEmbed, MessageActionRow, MessageButton, ButtonInteraction } from 'discord.js'
import dotenv from 'dotenv'
import * as Sender from './sender.js'
import * as Google from 'googleapis'

dotenv.config()

//Global variables
let length = 0
let confessors = []

let postChan
let modChan
let arrOfId = []

async function fromSheet(){
    const auth = new Google.google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    })

    const client = await auth.getClient()

    const googleSheets = Google.google.sheets({
        version: "v4",
        auth: client
    })

    const spreadsheetId = "process.env.SPREADID"

    const getRows = googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Sheet1!A2:B2"
    })

    return (await getRows).data.values[0]
}

async function writeToSheet(counter, numD){
    const auth = new Google.google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    })

    const client = await auth.getClient()

    const googleSheets = Google.google.sheets({
        version: "v4",
        auth: client
    })

    const spreadsheetId = "process.env.SPREADID"

    //Write to the file
    await googleSheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Sheet1!A2:B2",
        includeValuesInResponse: false,
        responseDateTimeRenderOption: "SERIAL_NUMBER",
        responseValueRenderOption: "FORMATTED_VALUE",
        valueInputOption: "USER_ENTERED",
        resource: {
            values: [
                [counter, numD]
            ]
        }
    })
}

//Resets variables that store confession data
function resetVar(){
    confessors = []
    length = 0
    arrOfId = []
}//resetVar

//What info the discord bot will use
const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
})

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
    const guildID = 'process.env.GUILD'
    const guild = client.guilds.cache.get(guildID)
    let commands

    //Discord channels
    postChan = client.channels.cache.find(channel => channel.id === 'process.env.POST')
    modChan = client.channels.cache.find(channel => channel.id === 'process.env.MOD')

    //Check if guild exists
    if(guild) commands = guild.commands
    else commands = client.application.commands

    //Command list (can seperate to different to different files using WOK commands but I am too lazy, plus simple bot)
    commands.create({
        name: 'confess',
        description: 'Sends a confession',
        options: [
            {
                name: 'text',
                description: 'The text the user sends for mod approval',
                required: true,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING
            },

            {
                name: 'title',
                description: 'Title of message',
                required: false,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING
            },
            
            {
                name: 'image-url',
                description: 'URL of image',
                required: false,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING
            }
        ]
    })//confess

    commands.create({
        name: 'help',
        description: "Gives list of all functions available"
    })

    commands.create({
        name: 'accept-all',
        description: 'Accepts all messages'
    })

    commands.create({
        name: 'reject-all',
        description: 'Rejects all messages'
    })

    commands.create({
        name: 'view-denied',
        description: 'See how many messages have been denied so far'
    })

    commands.create({
        name: 'pending',
        description: 'See how many mesasges are currently pending'
    })
})

client.on('interactionCreate', async interaction => {
    if(!interaction.isCommand()){
        return
    }

    if(arrOfId.length == 1000) interaction.reply({content:'Bot is full, try again later!', ephemeral: true})

    const { commandName, options } = interaction
    
    if(commandName === 'confess'){
        //Create new user
        let d = new Date()
        const user = new Sender.Sender(options.getString('text'), length++, options.getString('title'), null, interaction.user, null, options.getString('image-url'), d)
        let dateFormat = "".concat(user.senderMsg)
        user.descrip = dateFormat
        let userEmb

        //Checks whether the id is already taken
        while(arrOfId.includes(user.identifier)){
            user.updateAgain()
        }

        arrOfId.push(user.identifier)
        
        //checks whether the url is valid
        if(user.imageURL === null){
            userEmb = new MessageEmbed()
                .setDescription(dateFormat)
                .setColor('BLUE')
        }
        else if(!Sender.isValidUrl(user.imageURL)){
            interaction.reply({
                content: 'Invalid image url',
                ephemeral: true
            })
            resetVar()
            return
        }
        else{
            userEmb = new MessageEmbed()
                .setDescription(dateFormat)
                .setColor('BLUE')
                .setImage(user.imageURL)
        }

        userEmb.setTimestamp(user.date)
        if(user.title) userEmb.setTitle(user.title)
        
        const buttonRow = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('approve-btn'.concat(user.identifier))
                .setLabel('Approve')
                .setStyle('SUCCESS'),

            new MessageButton()
                .setCustomId('deny-btn'.concat(user.identifier))
                .setLabel('Deny')
                .setStyle('DANGER')
        )

        //Pass onto user
        user.userMsgFormat = userEmb
        
        try{
            await modChan.send({
                embeds: [userEmb],
                components: [buttonRow]
            })//Replace with button    
        }catch(err){
            interaction.reply({
                content: "Error! Must be from the web!",
                ephemeral: true
            })

            resetVar()
            return
        }

        await interaction.reply({
            content: Sender.CONFESS_THX,
            ephemeral: true,
        })

        confessors.push(user)
    }//confess

    else if(commandName === 'view-denied'){
        let numD = await fromSheet()
        interaction.reply({
            content: 'Number of messages denied: '.concat(numD[1]),
            ephemeral: true
        })
    }

    else if(commandName === 'help'){
        const userEmb = new MessageEmbed()
            .setDescription(Sender.HELP)
            .setColor('RED')
            .setTitle('Available command list')
            .setURL('https://www.youtube.com/watch?v=Ythwfm46YKQ&list=PLmTILQ2ZRDP-2NbqbYATovGQGtIt0uPR0')

        interaction.reply({
            embeds: [userEmb],
            ephemeral: true
        })
    }//help

    else if(commandName === 'pending'){
        interaction.reply({
            content: 'The number of messages pending is: '.concat(confessors.length),
            ephemeral: true
        })
    }//pending

    //Mod commands
    else if(interaction.member.roles.cache.some(r => r.name === 'Developer' || r.name === 'Head Moderator' || r.name === 'Moderator ' || r.name === 'Trainee Moderator' || r.name === 'Admin')){
        if(commandName === 'accept-all'){
            for(let i = 0; i<confessors.length; i++){
                let userEle = confessors[i]
                let [counter, numD] = await fromSheet()

                //Update the message
                let userEmb = new MessageEmbed()
                    .setDescription(userEle.descrip.concat(' \n\nConfession #', ++counter))
                    .setColor('BLUE')
                    .setTimestamp(userEle.date)

                if(userEle.imageURL) userEmb.setImage(userEle.imageURL)
                if(userEle.title) userEmb.setTitle(userEle.title)

                //Send msg to confessions channel
                postChan.send({
                    embeds: [userEmb]
                })

                await writeToSheet(counter, numD)
                await userEle.userDM.send('Your message has been approved! Check it out on <#995479367591403611>!')
            }//for

            interaction.reply('All messages have been accepted')
            resetVar()
        }//accept-all
        else if(commandName === 'reject-all'){
            let [counter, numD] = await fromSheet()
            numD = parseInt(numD)
            numD += confessors.length
            await writeToSheet(counter, numD)

            for(let i=0; i<confessors.length; i++){
                let userEle = confessors[i]
                await userEle.userDM.send('Your message has been denied.')
            }
            resetVar()
            interaction.reply('All messages have been denied')
        }//reject-all
    }
    else{
        await interaction.reply({
            content: 'Sorry, this command is reserved for mods!',
            ephemeral: true
        })
    }

})

client.on('interactionCreate', async interaction => {
    if(!interaction.isButton()) return;

    if(interaction.customId.startsWith("approve-btn")) {
        let btnId = interaction.customId.split('approve-btn')[1]
        let hasFound = false
        let [counter, numD] = await fromSheet()

        for(let i=0; i<confessors.length; i++){
            let ele = confessors[i]

            if(ele.key(btnId) != -1){
                btnId = ele.key(btnId)
                hasFound = true
            }//if
        }//Find the matching pos

        //If the button was pressed already
        if(btnId === -1 || !hasFound){
            await interaction.reply({
                content: 'That message has expired (someome else has already approved/denied it)!',
                ephemeral: true
            })
            return
        }

        //Update the message
        let userEmb = new MessageEmbed()
                    .setDescription(confessors[btnId].descrip.concat(' \n\nConfession #', ++counter))
                    .setColor('BLUE')
                    .setTimestamp(confessors[btnId].date)
            
        if(confessors[btnId].imageURL) userEmb.setImage(confessors[btnId].imageURL)
        if(confessors[btnId].title) userEmb.setTitle(confessors[btnId].title)

        postChan.send({
            embeds: [userEmb]
        })

        //Update sheet
        await writeToSheet(counter, numD)

        //Let's user know their message has been approved
        await confessors[btnId].userDM.send('Your message has been approved! Check it out on <#995479367591403611>!')

        arrOfId.splice(arrOfId.indexOf(confessors[btnId].identifier), 1)
        confessors.splice(btnId, 1)
        length = confessors.length
        
        //Updates user.pos
        for(let i = btnId; i < confessors.length;i++){
            confessors[i].updatePos()
        }

        await interaction.reply({
            content: 'Message has been approved'
        })

    }//if   
    else if(interaction.customId.startsWith("deny-btn")) {
        let btnId = interaction.customId.split('deny-btn')[1]
        let hasFound = false
        let [counter, numD] = await fromSheet()

        for(let i=0; i<confessors.length; i++){
            let ele = confessors[i]

            if(ele.key(btnId) != -1){
                btnId = ele.key(btnId)
                hasFound = true
            }//if
        }//Find the matching pos

        //If the button was pressed already
        if(btnId === -1 || !hasFound){
            interaction.reply({
                content: 'That message has expired (someone else has already approved/denied it)!',
                ephemeral: true
            })
            return
        }

        //Updates sheet and embed message
        await writeToSheet(counter, ++numD)

        await confessors[btnId].userDM.send('Your message has been denied.')

        arrOfId.splice(arrOfId.indexOf(confessors[btnId].identifier))
        confessors.splice(btnId, 1)
        length = confessors.length
        
        //Updates user.pos
        for(let i = btnId; i < confessors.length;i++){
            confessors[i].updatePos()
        }
        
        await interaction.reply({
            content: 'Message has been denied'
        })

    }//else if
})

client.login(process.env.TOKEN)
