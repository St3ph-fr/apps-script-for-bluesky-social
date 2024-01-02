const HANDLE='YOUR_HANDLE.bsky.social'; // To be changed
const DID_URL="https://bsky.social/xrpc/com.atproto.identity.resolveHandle";
const APP_PASSWORD = "YOUR APP PASSWORD"; // To be changed
const API_KEY_URL= "https://bsky.social/xrpc/com.atproto.server.createSession";
const FEED_URL="https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed";
const POST_FEED_URL = "https://bsky.social/xrpc/com.atproto.repo.createRecord";

function BlueskySocial() {
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

  // 3. Get user posts
  let feedUrl = encodeURI(FEED_URL+"?actor=HANDLE&limit=LIMIT")
    .replace("HANDLE",HANDLE) // your handle for testing
    .replace("LIMIT",2);

  let feedOpt = {
  'method' : 'GET',
  'headers'     : {"Authorization": "Bearer " + TOKEN}
  };

  const feedRep = UrlFetchApp.fetch(feedUrl, feedOpt);
  //console.log(postsRep.getContentText())
  const feed = JSON.parse(feedRep).feed ;
  feed.forEach(function (item){
    let post = item.post
    console.log("Date : "+post.record.createdAt)
    console.log("Text : "+post.record.text)
  })

  // 4. Publish a new post on Bluesky
  let postOpt = {
    'method' : 'POST',
    'headers'     : {"Authorization": "Bearer " + TOKEN},
    'contentType': 'application/json',
    'payload' : JSON.stringify({ "collection": "app.bsky.feed.post", "repo": DID, "record": 
      { "text": "Hello, world from Google Apps Script.", "createdAt": new Date().toISOString(), "$type": "app.bsky.feed.post" } 
    })
  };
  const postRep = UrlFetchApp.fetch(POST_FEED_URL, postOpt);
  console.log(postRep.getContentText())
}
