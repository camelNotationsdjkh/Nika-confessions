export class Sender{
  constructor(senderMsg, pos, title, userMsgFormat, userDM, descrip, imageURL, date){
    this.senderMsg = senderMsg
    this.pos = pos
    this.title = title
    this.userMsgFormat = userMsgFormat
    this.userDM = userDM
    this.descrip = descrip
    this.imageURL = imageURL
    this.date = date
    
    //Generate random user identifier (not seen by mods)
    this.identifier = Math.floor(Math.random() * 1001) + 1 // 1-1000
  }

  updateAgain(){
    this.identifier = Math.floor(Math.random() * 1001) + 1 // 1-1000
  }

  key(theKey){
    if(this.identifier == theKey) {
      return this.pos
    }
    else return -1
  }

  updatePos(){
    this.pos -= 1
  }
}

//Validates URL (Boolean)
export const isValidUrl = (url) => {
try {
  new URL(url)
} catch (e) {
  return false
}
return true
}

export const CONFESS_THX = "Thank you for your submission.\n Rest assured, your name is not visible to mods! Your request is awaiting mod approval."
export const HELP = "***Click on the title for a video demo!***\n\n> `/help`\nDisplay list of commands.\n\n> `/confess <text> <title>? <image-url>?`\nWrite your message anonymously here (formatted as an embeded message with title). Note, parameters ending with ? are optional. The parameter `<image-url>` will only take online web urls (see video on title for more information)\n\n> `/viewDenied`\nSee how many messages have been denied so far\n\n > `/pending`\nSee how many messages are currently pending.\n\n***MOD_ONLY\n--------------------------------------->***\n\n> `/accept-all`\nAccept all current saved messages.\n\n> `/reject-all` \nRejects all current saved messages"