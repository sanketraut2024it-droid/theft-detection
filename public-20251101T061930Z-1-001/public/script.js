const video=document.getElementById("cam");
navigator.mediaDevices.getUserMedia({video:true})
.then(s=>video.srcObject=s)
.catch(e=>alert("Camera error "+e));

setInterval(async()=>{
  const c=document.createElement("canvas");
  c.width=video.videoWidth; c.height=video.videoHeight;
  c.getContext("2d").drawImage(video,0,0,c.width,c.height);
  const image=c.toDataURL("image/jpeg");
  await fetch("/api/send",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({image})
  });
},1000); // every 1 s
