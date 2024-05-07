const RSS_FEED = 'YOUR FEED URL';
const HANDLE = 'YOUR HANDLE';
const DID_URL="https://bsky.social/xrpc/com.atproto.identity.resolveHandle";
const APP_PASSWORD = "YOUR APP PASSWORD";
const API_KEY_URL= "https://bsky.social/xrpc/com.atproto.server.createSession";
const FEED_URL="https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed";
const POST_FEED_URL = "https://bsky.social/xrpc/com.atproto.repo.createRecord";
const UPLOAD_IMG_URL = "https://bsky.social/xrpc/com.atproto.repo.uploadBlob";

function setupTrigger(){ // To be run to create trigger
  ScriptApp.newTrigger('publishFromRSS').timeBased().everyMinutes(15).create();
}

function publishFromRSS() {
  const url = RSS_FEED
  let rep = UrlFetchApp.fetch(url,{ muteHttpExceptions: true})
  if(rep.getResponseCode() != 200){
    console.log('Error : '+ rep.getContentText())
    return ;
  }
  // PropertiesService.getScriptProperties().deleteProperty('LINKS') ; // Uncomment to erase property and restart from 0
  let linkDone = JSON.parse(PropertiesService.getScriptProperties().getProperty('LINKS')) || {"items":[],"lastRun": new Date().getTime(),"init":true}
  const auth = BlueskyAuth();

  const xml = XmlService.parse(rep.getContentText());
  const root = xml.getRootElement();
  const channel = root.getChildren('channel')
  const entries = channel[0].getChildren("item");
  for(var i = 0 ; i < entries.length ; i++){
    let entry = entries[i]
    let link = entry.getChild("link").getValue();
    let title =  entry.getChild("title").getValue();
    if(linkDone.items.indexOf(link)<0 ){
      if(!linkDone.init){
        publishNews(title,link,auth)
      }
      linkDone.items.unshift(link)
      if(!linkDone.init){ linkDone.items.pop()}
    }
    // return false; // Uncomment to do just one publication
  }
  if(linkDone.init){ linkDone.init = false ;}
  linkDone.lastRun = new Date().getTime();
  PropertiesService.getScriptProperties().setProperty('LINKS',JSON.stringify(linkDone))
  console.log(linkDone)
}

function publishNews(title,link,auth){
  let details = getPostDetails(link);
  let description = details.description ? details.description : title;
  let message = { "collection": "app.bsky.feed.post", "repo": auth.did, "record": 
      { "text":description, "createdAt": new Date().toISOString(), "$type": "app.bsky.feed.post",
      "embed": {
      "$type": "app.bsky.embed.external",
      "external": {
        "uri": link,
        "title":title,
        "description": description
        
      }
     } 
    }
  }
  if(details.img){
    let blob = UrlFetchApp.fetch(details.img).getBlob()
    let blobOpt = {
      'method' : 'POST',
      'headers'     : {"Authorization": "Bearer " + auth.token},
      'contentType': blob.getContentType(),
      'muteHttpExceptions': true,
      'payload' : blob.getBytes()
    };
    let res = UrlFetchApp.fetch(UPLOAD_IMG_URL,blobOpt)
    if(res.getResponseCode() == 200){
       let pic = JSON.parse(res.getContentText());
    message.record.embed.external.thumb = pic.blob
    }
  }
  let postOpt = {
    'method' : 'POST',
    'headers'     : {"Authorization": "Bearer " + auth.token},
    'contentType': 'application/json',
    'muteHttpExceptions': true,
    'payload' : JSON.stringify(message)
  };
  const postRep = UrlFetchApp.fetch(POST_FEED_URL, postOpt);
  console.log(postRep.getContentText())
}

function BlueskyAuth(){
  // 1. we resolve handle
  let handleOpt = {
  'method' : 'GET',
  };
  let handleUrl = encodeURI(DID_URL+"?handle="+HANDLE)
  const handleRep = UrlFetchApp.fetch(handleUrl, handleOpt);
  const DID = JSON.parse(handleRep.getContentText()).did
  console.log(DID)

  // 2. We get Token
  let tokenOpt = {
  'method' : 'POST',
  'contentType': 'application/json',
  'payload' : JSON.stringify({"identifier":DID,"password":APP_PASSWORD})
  };
  const tokenRep = UrlFetchApp.fetch(API_KEY_URL, tokenOpt);
  // console.log(tokenRep.getContentText())
  const TOKEN = JSON.parse(tokenRep.getContentText()).accessJwt
  console.log(TOKEN)
  return {"did":DID,"token":TOKEN};
}

function getPostDetails(url){
  let details = {}
  let rep = UrlFetchApp.fetch(url,{ muteHttpExceptions: true})
  let html= rep.getContentText();
  if(html.indexOf('property="og:image"') < 0){
    details.img = false;
  }else{
    let start = html.indexOf('content="',html.indexOf('property="og:image"')) + 'content="'.length ; 
    let end = html.indexOf('"',start)
    details.img = html.substring(start,end)
  }

  let start = html.indexOf('content="',html.indexOf('meta name="description"')) + 'content="'.length ;
  if(start >0){
    let end = html.indexOf('"',start)
    details.description = decodeHTML(html.substring(start,end))
  }else{
    details.description = false
  }
  console.log(details)
  return details;
}

function decodeHTML(txt) {
  // From answer : https://stackoverflow.com/a/4339083/3556215
  var map = {"gt":">" /* , … */};
  return txt.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);?/gi, function($0, $1) {
      if ($1[0] === "#") {
          return String.fromCharCode($1[1].toLowerCase() === "x" ? parseInt($1.substr(2), 16)  : parseInt($1.substr(1), 10));
      } else {
          return map.hasOwnProperty($1) ? map[$1] : $0;
      }
  });
}
