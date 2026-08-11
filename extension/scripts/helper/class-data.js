export function updateCurrentClass(classId, openFeed) {
    // application route
    const url = `${window.location.origin}/oa_school/elearning/Online_class/eCls`; 

    // payload setup (x-www-form-urlencoded)
    const payload = new URLSearchParams();
    payload.append('f', 'setClassSession');
    payload.append('cid', classId);

    // request dispatching (no internal orangeapps api used w)
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // header here SHOULD(?) mimic an ajax request
            'X-Requested-With': 'XMLHttpRequest' 
        },
        body: payload
    })
    .then(response => response.text()) // parse incoming response as plain text
    .then(responseText => {
        // handle success mapping
        if (responseText.trim() === "1") {
            if (openFeed === true) {
                window.location.href = 'classfeed';   
            }
        } else {
            console.error(`Failed to set session of id ${classId}. Server returned: ${responseText}`);
        }
    })
    .catch(error => {
        console.error('Network or server error encountered:', error);
    });
};