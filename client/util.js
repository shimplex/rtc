function copy() {
    var copyText = document.getElementById("text_for_send_sdp");
    copyText.select();
    document.execCommand("copy");
    alert(copyText.value);
}
  
document.getElementById("copy").addEventListener("click", copy);
