/**
 *-------------------------------------------------------------
 * Global variables
 *-------------------------------------------------------------
 */
 var messenger,
	typingTimeout,
	typingNow               = 0,
	temporaryMsgId          = 0,
	defaultAvatarInSettings = null,
	messengerColor,
	dark_mode,
	messages_page           = 1;

// Set locale &Timezone
moment.locale( $("meta[name='time-locale']").attr("content") );
moment.tz.setDefault( $("meta[name='time-timezone']").attr("content") );

const messagesContainer     = $(".messenger-messagingView .m-body"),
      messengerTitleDefault = $(".messenger-headTitle").text(),
      messageInput          = $("#message-form .m-send"),
      auth_id               = $("meta[name=url]").attr("data-user"),
      url                   = $("meta[name=url]").attr("content"),
      defaultMessengerColor = $("meta[name=messenger-color]").attr("content"),
      access_token          = $('meta[name="csrf-token"]').attr("content");

const getMessengerId        = () => $("meta[name=id]").attr("content");
const getMessengerType      = () => $("meta[name=type]").attr("content");
const setMessengerId        = (id) => $("meta[name=id]").attr("content", id);
const setMessengerType      = (type) => $("meta[name=type]").attr("content", type);

/**
*-------------------------------------------------------------
* Re-usable methods
*-------------------------------------------------------------
*/
const escapeHtml = (unsafe) => {
 	return unsafe
				.replace(/&/g, "&")
				.replace(/</g, "<")
				.replace(/>/g, ">");
};

function actionOnScroll(selector, callback, topScroll = false) {
	$(selector).on("scroll", function () {
		let element = $(this).get(0);
		const condition = topScroll ?
			element.scrollTop == 0 :
			element.scrollTop + element.clientHeight >= element.scrollHeight;
		if (condition) {
			callback();
		}
	});
}

function routerPush(title, url) {
 	$("meta[name=url]").attr("content", url);
 	return window.history.pushState({}, title || document.title, url);
}

/**
* Update selected contact
* 
* @param {Integer} user_id 
*/
function updateSelectedContact(user_id) {

	// Remove active class
	$(document).find(".messenger-list-item").removeClass("m-list-active");

	// Add active class to new selected contact
	$(document).find(".messenger-list-item[data-contact-id=" + (user_id || getMessengerId()) + "]").addClass("m-list-active");

}

/**
*-------------------------------------------------------------
* Global Templates
*-------------------------------------------------------------
*/
// Loading svg
function loadingSVG(size = "25px", className = "", style = "") {
 return `
	<svg style="${style}" class="loadingSVG ${className}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40" stroke="#ffffff">
	<g fill="none" fill-rule="evenodd">
	<g transform="translate(2 2)" stroke-width="3">
	<circle stroke-opacity=".1" cx="18" cy="18" r="18"></circle>
	<path d="M36 18c0-9.94-8.06-18-18-18" transform="rotate(349.311 18 18)">
	<animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur=".8s" repeatCount="indefinite"></animateTransform>
	</path>
	</g>
	</g>
	</svg>
	`;
}

function loadingWithContainer(className) {
	return `<div class="${className}" style="text-align:center;padding:15px">${loadingSVG(
	"25px",
	"",
	"margin:auto"
	)}</div>`;
}

// loading placeholder for users list item
function listItemLoading(items) {
 let template = "";
 for (let i = 0; i < items; i++) {
	 template += `
<div class="loadingPlaceholder">
<div class="loadingPlaceholder-wrapper">
<div class="loadingPlaceholder-body">
<table class="loadingPlaceholder-header">
<tr>
<td style="width: 45px;"><div class="loadingPlaceholder-avatar"></div></td>
<td>
<div class="loadingPlaceholder-name"></div>
   <div class="loadingPlaceholder-date"></div>
</td>
</tr>
</table>
</div>
</div>
</div>
`;
 }
 return template;
}

// loading placeholder for avatars
function avatarLoading(items) {
 let template = "";
 for (let i = 0; i < items; i++) {
	 template += `
<div class="loadingPlaceholder">
<div class="loadingPlaceholder-wrapper">
<div class="loadingPlaceholder-body">
<table class="loadingPlaceholder-header">
 <tr>
	 <td style="width: 45px;">
		 <div class="loadingPlaceholder-avatar" style="margin: 2px;"></div>
	 </td>
 </tr>
</table>
</div>
</div>
</div>
`;
 }
 return template;
}

// While sending a message, show this temporary message card.
function sendTempMessageCard(message, id) {

	// Get default direction
	const dir = $('html').attr('dir');

	// Set message
	if (chatify.enable_emojis) {
		message = escapeHtml(twemoji.parse(message)).replace(/<\/?[^>]+(>|$)/g, "");
	} else {
		message = escapeHtml(message).replace(/<\/?[^>]+(>|$)/g, "");
	}

 	return `
		<div class="message-card mc-sender" data-id="${id}">
		<div class="msg-card-content">
		${message}
		</div>
		<div class="flex items-center justify-end space-x-3 rtl:space-x-reverse !mt-1.5" dir="${dir}">
		<svg class="text-gray-500 dark:text-zinc-300 w-4.5 h-4.5 -mt-px" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"></path><path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"></path></g></svg>
		</div>
		</div>
	`;

}
// upload image preview card.
function attachmentTemplate(fileType, fileName, imgURL = null) {
 var re = /(?:\.([^.]+))?$/;
 var extension = re.exec(fileName)[1];
 if (fileType != "image") {
	 return (
		 `
<div class="attachment-preview flex items-center space-x-4 rtl:space-x-reverse">
<svg class="w-5 h-5 cancel cursor-pointer" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"></path><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-11.414L9.172 7.757 7.757 9.172 10.586 12l-2.829 2.828 1.415 1.415L12 13.414l2.828 2.829 1.415-1.415L13.414 12l2.829-2.828-1.415-1.415L12 10.586z"></path></g></svg>
<div>
 <div class="fi fi-size-xs fi-${extension}">
	 <div class="fi-content">${extension}</div>
 </div><span class="text-xs font-medium text-gray-600 dark:text-gray-200 mt-1 block">` +
		 escapeHtml(fileName) +
		 `</span></div>
</div>
`
	 );
 } else {
	 return (
		 `
<div class="attachment-preview flex items-center space-x-4 rtl:space-x-reverse">
<svg class="w-5 h-5 cancel cursor-pointer" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"></path><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-11.414L9.172 7.757 7.757 9.172 10.586 12l-2.829 2.828 1.415 1.415L12 13.414l2.828 2.829 1.415-1.415L13.414 12l2.829-2.828-1.415-1.415L12 10.586z"></path></g></svg>
<div class="image-file chat-image" style="background-image: url('` +
		 imgURL +
		 `');"></div>
<p>` +
		 escapeHtml(fileName) +
		 `</p>
</div>
`
	 );
 }
}

// Active Status Circle
function activeStatusCircle() {
 return `<span class="activeStatus"></span>`;
}

/**
*-------------------------------------------------------------
* Css Media Queries [For responsive design]
*-------------------------------------------------------------
*/
window.addEventListener('resize', function () {
 	cssMediaQueries();
});

function cssMediaQueries() {
	if (window.matchMedia("(min-width: 980px)").matches) {
		$(".messenger-listView").removeAttr("style");
	}
	if (window.matchMedia("(max-width: 980px)").matches) {
		$("body")
			.find(".messenger-list-item")
			.find("tr[data-action]")
			.attr("data-action", "1");
		$("body").find(".favorite-list-item").find("div").attr("data-action", "1");
	} else {
		$("body")
			.find(".messenger-list-item")
			.find("tr[data-action]")
			.attr("data-action", "0");
		$("body").find(".favorite-list-item").find("div").attr("data-action", "0");
	}
}

/**
*-------------------------------------------------------------
* App Modal
*-------------------------------------------------------------
*/
let app_modal = function ({
 show    = true,
 name,
 data    = 0,
 buttons = true,
 header  = null,
 body    = null,
}) {
 const modal = $(".app-modal[data-name=" + name + "]");
 // header
 header ? modal.find(".app-modal-header").html(header) : "";

 // body
 body ? modal.find(".app-modal-body").html(body) : "";

 // buttons
 buttons == true ?
	 modal.find(".app-modal-footer").show() :
	 modal.find(".app-modal-footer").hide();

 // show / hide
 if (show == true) {
	 modal.show();
	 $(".app-modal-card[data-name=" + name + "]").addClass("app-show-modal");
	 $(".app-modal-card[data-name=" + name + "]").attr("data-modal", data);
 } else {
	 modal.hide();
	 $(".app-modal-card[data-name=" + name + "]").removeClass("app-show-modal");
	 $(".app-modal-card[data-name=" + name + "]").attr("data-modal", data);
 }
};

/**
*-------------------------------------------------------------
* Slide to bottom on [action] - e.g. [message received, sent, loaded]
*-------------------------------------------------------------
*/
function scrollToBottom(container) {
	$(container)
		.stop()
		.animate({
			scrollTop: $(container)[0].scrollHeight,
		});
}

/**
*-------------------------------------------------------------
* click and drag to scroll - function
*-------------------------------------------------------------
*/
function hScroller(scroller) {
	const slider = document.querySelector(scroller);
	let   isDown = false;
	let startX;
	let scrollLeft;

	slider.addEventListener("mousedown", (e) => {
		isDown = true;
		startX = e.pageX - slider.offsetLeft;
		scrollLeft = slider.scrollLeft;
	});
	slider.addEventListener("mouseleave", () => {
		isDown = false;
	});
	slider.addEventListener("mouseup", () => {
		isDown = false;
	});
	slider.addEventListener("mousemove", (e) => {
		if (!isDown) return;
		e.preventDefault();
		const x = e.pageX - slider.offsetLeft;
		const walk = (x - startX) * 1;
		slider.scrollLeft = scrollLeft - walk;
	});
}

/**
*-------------------------------------------------------------
* Disable/enable message form fields, messaging container...
* on load info or if needed elsewhere.
*
* Default : true
*-------------------------------------------------------------
*/
function disableOnLoad(action = true) {
	if (action == true) {
		// hide star button
		$(".add-to-favorite").hide();
		// hide send card
		$(".messenger-sendCard").hide();
		// add loading opacity to messages container
		messagesContainer.css("opacity", ".5");
		// disable message form fields
		messageInput.attr("readonly", "readonly");
		$("#message-form button").attr("disabled", "disabled");
		$(".upload-attachment").attr("disabled", "disabled");
	} else {
		// show star button
		if (getMessengerId() != auth_id) {
			$(".add-to-favorite").show();
		}
		// show send card
		$(".messenger-sendCard").show();
		// remove loading opacity to messages container
		messagesContainer.css("opacity", "1");
		// enable message form fields
		messageInput.removeAttr("readonly");
		$("#message-form button").removeAttr("disabled");
		$(".upload-attachment").removeAttr("disabled");
	}
}

/**
*-------------------------------------------------------------
* Error message card
*-------------------------------------------------------------
*/
function errorMessageCard(id) {
	messagesContainer
		.find(".message-card[data-id=" + id + "]")
		.addClass("mc-error");
	messagesContainer
		.find(".message-card[data-id=" + id + "]")
		.find("svg.loadingSVG")
		.remove();
	messagesContainer
		.find(".message-card[data-id=" + id + "] p")
		.prepend('<span class="fas fa-exclamation-triangle"></span>');
}

/**
*-------------------------------------------------------------
* Fetch id data (user/group) and update the view
*-------------------------------------------------------------
*/
function IDinfo(id, type) {
	// clear temporary message id
	temporaryMsgId = 0;
	// clear typing now
	typingNow      = 0;
	// show loading bar
	NProgress.start();
	// disable message form
	disableOnLoad();
	if (messenger != 0) {
		// get shared photos
		getSharedPhotos(id);
		// Get info
		$.ajax({
			url: url + "/idInfo",
			method: "POST",
			data: {
				id,
				type
			},
			headers: {
				'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
			},
			xhrFields: {
				withCredentials: true
			 },
			dataType: "JSON",
			success: (data) => {
				// avatar photo
				$(".messenger-infoView")
					.find(".avatar")
					.css("background-image", 'url("' + data.user_avatar + '")');
				$(".header-avatar").css(
					"background-image",
					'url("' + data.user_avatar + '")'
				);
				// Show shared and actions
				$(".messenger-infoView-btns .delete-conversation").show();
				$(".messenger-infoView-shared").show();
				// fetch messages
				fetchMessages(id, type, true);
				// focus on messaging input
				messageInput.focus();
				// update info in view
				$(".messenger-infoView .info-name").text(data.fetch.username);
				$(".m-header-messaging .user-name").text(data.fetch.username);

				// Set fullname
				if (data.fetch.fullname) {
					$('#selected-contact-fullname').text(data.fetch.fullname);
					$('#selected-contact-fullname').show();
				} else {
					$('#selected-contact-fullname').text('');
					$('#selected-contact-fullname').hide();
				}

				// Set username
				if (data.fetch.username) {
					$('#selected-contact-username').text(data.fetch.username);
					$('#selected-contact-username').show();
				}

				// Is account verified
				if (data.fetch.status === 'verified') {
					$('#selected-contact-verification').show();
				}

				// Set profile link
				$('#selected-contact-view-profile-link').attr('href', __var_app_url + '/profile/' + data.fetch.username);

				$('.m-header-messaging').show();
				// Star status
				data.favorite > 0 ?
					$(".add-to-favorite").addClass("favorite") :
					$(".add-to-favorite").removeClass("favorite");
				// form reset and focus
				$("#message-form").trigger("reset");
				cancelAttachment();
				messageInput.focus();
			},
			error: () => {
				console.error("Error, check server response!");
				// remove loading bar
				NProgress.done();
				NProgress.remove();
			},
		});
	} else {
		// remove loading bar
		NProgress.done();
		NProgress.remove();
	}
}

/**
*-------------------------------------------------------------
* Send message function
*-------------------------------------------------------------
*/
function sendMessage() {
	      temporaryMsgId += 1;
	let   tempID          = `temp_${temporaryMsgId}`;
	let   hasFile         = !!$(".upload-attachment").val() && chatify.enable_attachments;
	const inputValue      = $.trim(messageInput.val());

	if (inputValue.length > 0 || hasFile) {
		const formData = new FormData($("#message-form")[0]);
		formData.append("id", getMessengerId());
		formData.append("type", getMessengerType());
		formData.append("temporaryMsgId", tempID);
		$.ajax({
			url: $("#message-form").attr("action"),
			method: "POST",
			data: formData,
			dataType: "JSON",
			headers: {
				'X-CSRF-TOKEN': access_token
			},
			xhrFields: {
				withCredentials: true
			},
			processData: false,
			contentType: false,
			beforeSend: () => {
				// remove message hint
				$(".messages").find(".message-hint").remove();
				// append a temporary message card
				if (hasFile) {
					messagesContainer
						.find(".messages")
						.append(
							sendTempMessageCard(
								inputValue + "\n" + loadingSVG("28px"),
								tempID
							)
						);
				} else {
					messagesContainer
						.find(".messages")
						.append(sendTempMessageCard(inputValue, tempID));
				}
				// scroll to bottom
				scrollToBottom(messagesContainer);
				messageInput.css({
					height: "42px"
				});
				// form reset and focus
				$("#message-form").trigger("reset");
				cancelAttachment();
				messageInput.focus();
			},
			success: (data) => {
				if (data.error > 0) {
					// message card error status
					errorMessageCard(tempID);
					console.error(data.error_msg);
				} else {
					// update contact item
					updateContactItem(getMessengerId());
					// temporary message card
					const tempMsgCardElement = messagesContainer.find(
						`.message-card[data-id=${data.tempID}]`
					);
					// add the message card coming from the server before the temp-card
					tempMsgCardElement.before(data.message);
					// then, remove the temporary message card
					tempMsgCardElement.remove();
					// scroll to bottom
					scrollToBottom(messagesContainer);
					// send contact item updates
					sendContactItemUpdates(true);

					$( ".message-time" ).each( function( index ) {

						// Get element
						const element        = $(this);
				
						// Get time
						const created_at     = element.attr('data-time');
						
						// Format time
						const formatted_time = moment(created_at).fromNow();
				
						// Set formatted time
						element.text( formatted_time );
				
					});

				}
			},
			error: () => {
				// message card error status
				errorMessageCard(tempID);
				// error log
				console.error(
					"Failed sending the message! Please, check your server response."
				);
			},
		});
	}

	return false;
}

/**
*-------------------------------------------------------------
* Fetch messages from database
*-------------------------------------------------------------
*/
let messagesPage    = 1;
let noMoreMessages  = false;
let messagesLoading = false;

function setMessagesLoading(loading = false) {
	if (!loading) {
		messagesContainer.find(".messages").find(".loading-messages").remove();
		NProgress.done();
		NProgress.remove();
	} else {
		messagesContainer
			.find(".messages")
			.prepend(loadingWithContainer("loading-messages"));
	}
	messagesLoading = loading;
}

function fetchMessages(id, type, newFetch = false) {
	if (newFetch) {
		messagesPage   = 1;
		noMoreMessages = false;
	}
	if (messenger != 0 && !noMoreMessages && !messagesLoading) {
		const messagesElement = messagesContainer.find(".messages");
		setMessagesLoading(true);
		$.ajax({
			url: url + "/fetchMessages",
			method: "POST",
			data: {
				id: id,
				type: type,
				page: messagesPage,
			},
			headers: {
				'X-CSRF-TOKEN': access_token
			},
			xhrFields: {
				withCredentials: true
			},
			dataType: "JSON",
			success: (data) => {
				setMessagesLoading(false);
				if (messagesPage == 1) {
					messagesElement.html(data.messages);
					scrollToBottom(messagesContainer);
				} else {
					const lastMsg = messagesElement.find(
						messagesElement.find(".message-card")[0]
					);
					const curOffset =
						lastMsg.offset().top - messagesContainer.scrollTop();
					messagesElement.prepend(data.messages);
					messagesContainer.scrollTop(lastMsg.offset().top - curOffset);
				}
				// trigger seen event
				makeSeen(true);
				// Pagination lock & messages page
				noMoreMessages = messagesPage >= data?.last_page;
				if (!noMoreMessages) messagesPage += 1;
				// Enable message form if messenger not = 0; means if data is valid
				if (messenger != 0) {
					disableOnLoad(false);
				}
			},
			error: (error) => {
				setMessagesLoading(false);
				console.error(error);
			},
		});
	}
}

/**
*-------------------------------------------------------------
* Cancel file attached in the message.
*-------------------------------------------------------------
*/
function cancelAttachment() {
	$(".messenger-sendCard").find(".attachment-preview").remove();
	$(".upload-attachment").replaceWith(
		$(".upload-attachment").val("").clone(true)
	);
}

/**
*-------------------------------------------------------------
* Cancel updating avatar in settings
*-------------------------------------------------------------
*/
function cancelUpdatingAvatar() {
	$(".upload-avatar-preview").css("background-image", defaultAvatarInSettings);
	$(".upload-avatar").replaceWith($(".upload-avatar").val("").clone(true));
}

/**
*-------------------------------------------------------------
* Pusher channels and event listening..
*-------------------------------------------------------------
*/


// Set channel name
const channel_name = "private-chat";

// Subscribe to channel
var channel = pusher.subscribe(`${channel_name}.${auth_id}`);

var clientSendChannel;
var clientListenChannel;

function initClientChannel() {
	if (getMessengerId()) {
		clientSendChannel   = pusher.subscribe(`${channel_name}.${getMessengerId()}`);
		clientListenChannel = pusher.subscribe(`${channel_name}.${auth_id}`);
	}
}

initClientChannel();

// Listen to messages, and append if data received
channel.bind("messaging", function (data) {
	if (data.from_id == getMessengerId() && data.to_id == auth_id) {
		$(".messages").find(".message-hint").remove();
		messagesContainer.find(".messages").append(data.message);
		scrollToBottom(messagesContainer);
		makeSeen(true);
		$( ".message-time" ).each( function( index ) {

			// Get element
			const element        = $(this);

			// Get time
			const created_at     = element.attr('data-time');
			
			// Format time
			const formatted_time = moment(created_at).fromNow();

			// Set formatted time
			element.text( formatted_time );

		});
		// remove unseen counter for the user from the contacts list
		$(".messenger-list-item[data-contact-id=" + getMessengerId() + "]")
			.find(".new-messages-counter")
			.remove();
	}

	playNotificationSound(
		"new_message",
		(data.from_id == getMessengerId() && data.to_id == auth_id)
	);
});

// listen to typing indicator
clientListenChannel.bind("client-typing", function (data) {
	if (data.from_id == getMessengerId() && data.to_id == auth_id) {

		if (data.typing) {

			// Show typing
			messagesContainer.find(".typing-indicator").show();

		} else {

			// Hide it
			messagesContainer.find(".typing-indicator").hide();

		}
		
	}
	// scroll to bottom
	scrollToBottom(messagesContainer);
});

// Listen to seen event
clientListenChannel.bind("client-seen", function (data) {

 // Mark as read
 if (data.from_id == getMessengerId() && data.to_id == auth_id) {

	 // Is messages seen?
	 if (data.seen == true) {

		 // Insert seen icon
		 $(".message-seen-status").html('<svg class="text-blue-500 w-4.5 h-4.5 -mt-px message-is-seen" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"></path><path d="M11.602 13.76l1.412 1.412 8.466-8.466 1.414 1.414-9.88 9.88-6.364-6.364 1.414-1.414 2.125 2.125 1.413 1.412zm.002-2.828l4.952-4.953 1.41 1.41-4.952 4.953-1.41-1.41zm-2.827 5.655L7.364 18 1 11.636l1.414-1.414 1.413 1.413-.001.001 4.951 4.951z"></path></g></svg>');

		 // Remove not seen icon
		 $(".message-seen-status").find(".message-not-seen").remove();

		 // Remove delete button

	 }

 }

});

// listen to contact item updates event
clientListenChannel.bind("client-contactItem", function (data) {
 if (data.update_for == auth_id) {
	 data.updating == true ?
		 updateContactItem(data.update_to) :
		 console.error("[Contact Item updates] Updating failed!");
 }
});

// listen on message delete event
clientListenChannel.bind("client-messageDelete", function (data) {
 $("body").find(`.message-card[data-id=${data.id}]`).remove();
});

// -------------------------------------
// presence channel [User Active Status]
var activeStatusChannel = pusher.subscribe("presence-activeStatus");

// Joined
activeStatusChannel.bind("pusher:member_added", function (member) {
 setActiveStatus(1, member.id);
 $(".messenger-list-item[data-contact-id=" + member.id + "]")
	 .find(".activeStatus")
	 .remove();
 $(".messenger-list-item[data-contact-id=" + member.id + "]")
	 .find(".avatar")
	 .before(activeStatusCircle());
});

// Leaved
activeStatusChannel.bind("pusher:member_removed", function (member) {
 setActiveStatus(0, member.id);
 $(".messenger-list-item[data-contact-id=" + member.id + "]")
	 .find(".activeStatus")
	 .remove();
});

function handleVisibilityChange() {
 if (!document.hidden) {
	 makeSeen(true);
 }
}

document.addEventListener("visibilitychange", handleVisibilityChange, false);

/**
*-------------------------------------------------------------
* Trigger typing event
*-------------------------------------------------------------
*/
function isTyping(status) {
 return clientSendChannel.trigger("client-typing", {
	 from_id: auth_id, // Me
	 to_id: getMessengerId(), // Messenger
	 typing: status,
 });
}

/**
*-------------------------------------------------------------
* Notification sounds
*-------------------------------------------------------------
*/
function playNotificationSound(soundName, condition = false) {
 if ((document.hidden || condition) && chatify.enable_notification_sound) {
	 const sound = new Audio(chatify.notification_sound);
	 sound.play();
 }
}

/**
*-------------------------------------------------------------
* Trigger seen event
*-------------------------------------------------------------
*/
function makeSeen(status) {
	if (document?.hidden) {
		return;
	}

	// remove unseen counter for the user from the contacts list
	$(".messenger-list-item[data-contact-id=" + getMessengerId() + "]")
		.find(".new-messages-counter")
		.remove();

	// seen
	$.ajax({
		url   : url + "/makeSeen",
		method: "POST",
		data  : {
			id: getMessengerId()
		},
		headers: {
			'X-CSRF-TOKEN': access_token
		},
		xhrFields: {
			withCredentials: true
		},
		dataType: "JSON",
	});
	
	return clientSendChannel.trigger("client-seen", {
		from_id: auth_id,            // Me
		to_id  : getMessengerId(),   // Messenger
		seen   : status,
	});
}

/**
*-------------------------------------------------------------
* Trigger contact item updates
*-------------------------------------------------------------
*/
function sendContactItemUpdates(status) {
 return clientSendChannel.trigger("client-contactItem", {
	 update_for: getMessengerId(), // Messenger
	 update_to: auth_id, // Me
	 updating: status,
 });
}

/**
*-------------------------------------------------------------
* Trigger message delete
*-------------------------------------------------------------
*/
function sendMessageDeleteEvent(messageId) {
 return clientSendChannel.trigger("client-messageDelete", {
	 id: messageId,
 });
}

/**
*-------------------------------------------------------------
* Check internet connection using pusher states
*-------------------------------------------------------------
*/
function checkInternet(state, selector) {
 let net_errs = 0;
 const messengerTitle = $(".messenger-headTitle");
 switch (state) {
	 case "connected":
		 if (net_errs < 1) {
			 messengerTitle.text(messengerTitleDefault);
			 selector.addClass("successBG-rgba");
			 selector.find("span").hide();
			 selector.slideDown("fast", function () {
				 selector.find(".ic-connected").show();
			 });
			 setTimeout(function () {
				 $(".internet-connection").slideUp("fast");
			 }, 3000);
		 }
		 break;
	 case "connecting":
		 messengerTitle.text($(".ic-connecting").text());
		 selector.removeClass("successBG-rgba");
		 selector.find("span").hide();
		 selector.slideDown("fast", function () {
			 selector.find(".ic-connecting").show();
		 });
		 net_errs = 1;
		 break;
		 // Not connected
	 default:
		 messengerTitle.text($(".ic-noInternet").text());
		 selector.removeClass("successBG-rgba");
		 selector.find("span").hide();
		 selector.slideDown("fast", function () {
			 selector.find(".ic-noInternet").show();
		 });
		 net_errs = 1;
		 break;
 }
}

/**
*-------------------------------------------------------------
* Get contacts
*-------------------------------------------------------------
*/
let contactsPage = 1;
let contactsLoading = false;
let noMoreContacts = false;

function setContactsLoading(loading = false) {
 if (!loading) {
	 $(".listOfContacts").find(".loading-contacts").remove();
 } else {
	 $(".listOfContacts").append(
		 `<div class="loading-contacts">${listItemLoading(4)}</div>`
	 );
 }
 contactsLoading = loading;
}

function getContacts() {
 if (!contactsLoading && !noMoreContacts) {
	 setContactsLoading(true);
	 $.ajax({
		 url: url + "/getContacts",
		 method: "GET",
		 data: {
			 page: contactsPage
		 },
		 headers: {
			 'X-CSRF-TOKEN': access_token
		 },
		 xhrFields: {
			withCredentials: true
		 },
		 dataType: "JSON",
		 success: (data) => {
			 setContactsLoading(false);
			 if (contactsPage < 2) {
				 $(".listOfContacts").html(data.contacts);
			 } else {
				 $(".listOfContacts").append(data.contacts);
			 }
			 updateSelectedContact();
			 // update data-action required with [responsive design]
			 cssMediaQueries();
			 // Pagination lock & messages page
			 noMoreContacts = contactsPage >= data?.last_page;
			 if (!noMoreContacts) contactsPage += 1;
		 },
		 error: (error) => {
			 setContactsLoading(false);
			 console.error(error);
		 },
	 });
 }
}

/**
*-------------------------------------------------------------
* Update contact item
*-------------------------------------------------------------
*/
function updateContactItem(user_id) {

 if (user_id != auth_id) {
	 let listItem = $("body")
		 .find(".listOfContacts")
		 .find(".messenger-list-item[data-contact-id=" + user_id + "]");
	 $.ajax({
		 url: url + "/updateContacts",
		 method: "POST",
		 data: {
			 user_id,
		 },
		 headers: {
			 'X-CSRF-TOKEN': access_token
		 },
		 xhrFields: {
			withCredentials: true
		 },
		 dataType: "JSON",
		 success: (data) => {
			 const totalContacts =
				 $(".listOfContacts").find(".messenger-list-item")?.length || 0;
			 if (totalContacts < 1)
				 $(".listOfContacts").find(".message-hint").remove();
			 listItem.remove();
			 $(".listOfContacts").prepend(data.contactItem);
			 // update data-action required with [responsive design]
			 cssMediaQueries();
			 updateSelectedContact(user_id);
		 },
		 error: () => {
			 console.error("Server error, check your response");
		 },
	 });
 }
}

/**
*-------------------------------------------------------------
* Star
*-------------------------------------------------------------
*/

function star(user_id) {
 if (getMessengerId() != auth_id) {
	 $.ajax({
		 url: url + "/star",
		 method: "POST",
		 data: {
			 user_id: user_id
		 },
		 headers: {
			 'X-CSRF-TOKEN': access_token
		 },
		 xhrFields: {
			withCredentials: true
		 },
		 dataType: "JSON",
		 success: (data) => {
			 data.status > 0 ?
				 $(".add-to-favorite").addClass("favorite") :
				 $(".add-to-favorite").removeClass("favorite");
		 },
		 error: () => {
			 console.error("Server error, check your response");
		 },
	 });
 }
}

/**
*-------------------------------------------------------------
* Get favorite list
*-------------------------------------------------------------
*/
function getFavoritesList() {
 $(".messenger-favorites").html(avatarLoading(4));
 $.ajax({
	 url: url + "/favorites",
	 method: "POST",
	 headers: {
		 'X-CSRF-TOKEN': access_token
	 },
	 xhrFields: {
		withCredentials: true
	 },
	 dataType: "JSON",
	 success: (data) => {
		 if (data.count > 0) {
			 $(".favorites-section").show();
			 $(".messenger-favorites").html(data.favorites);
		 } else {
			 $(".favorites-section").hide();
		 }
		 // update data-action required with [responsive design]
		 cssMediaQueries();
	 },
	 error: () => {
		 console.error("Server error, check your response");
	 },
 });
}

/**
*-------------------------------------------------------------
* Get shared photos
*-------------------------------------------------------------
*/
function getSharedPhotos(user_id) {
 $.ajax({
	 url: url + "/shared",
	 method: "POST",
	 data: {
		 user_id: user_id
	 },
	 headers: {
		 'X-CSRF-TOKEN': access_token
	 },
	 xhrFields: {
		withCredentials: true
	 },
	 dataType: "JSON",
	 success: (data) => {

		// Check if has shared photos
		if (!data.empty) {

			// Remove grid classes
			$('.shared-photos-list').removeClass('grid grid-cols-4 md:gap-x-3 gap-y-4');
		}

		$(".shared-photos-list").html(data.shared);

	 },
	 error: () => {
		 console.error("Server error, check your response");
	 },
 });
}

/**
*-------------------------------------------------------------
* Search in messenger
*-------------------------------------------------------------
*/
let searchPage = 1;
let noMoreDataSearch = false;
let searchLoading = false;
let searchTempVal = "";

function setSearchLoading(loading = false) {
 if (!loading) {
	 $(".search-records").find(".loading-search").remove();
 } else {
	 $(".search-records").append(
		 `<div class="loading-search">${listItemLoading(4)}</div>`
	 );
 }
 searchLoading = loading;
}

function messengerSearch(input) {
 if (input != searchTempVal) {
	 searchPage = 1;
	 noMoreDataSearch = false;
	 searchLoading = false;
 }
 searchTempVal = input;
 if (!searchLoading && !noMoreDataSearch) {
	 if (searchPage < 2) {
		 $(".search-records").html("");
	 }
	 setSearchLoading(true);
	 $.ajax({
		 url: url + "/search",
		 method: "GET",
		 data: {
			 input: input,
			 page: searchPage
		 },
		 headers: {
			 'X-CSRF-TOKEN': access_token
		 },
		 xhrFields: {
			withCredentials: true
		 },
		 dataType: "JSON",
		 success: (data) => {
			 setSearchLoading(false);
			 if (searchPage < 2) {
				 $(".search-records").html(data.records);
			 } else {
				 $(".search-records").append(data.records);
			 }
			 // update data-action required with [responsive design]
			 cssMediaQueries();
			 // Pagination lock & messages page
			 noMoreDataSearch = searchPage >= data?.last_page;
			 if (!noMoreDataSearch) searchPage += 1;
		 },
		 error: (error) => {
			 setSearchLoading(false);
			 console.error(error);
		 },
	 });
 }
}

/**
*-------------------------------------------------------------
* Delete Conversation
*-------------------------------------------------------------
*/
function deleteConversation(id) {
 $.ajax({
	 url: url + "/deleteConversation",
	 method: "POST",
	 data: {
		 id: id
	 },
	 headers: {
		 'X-CSRF-TOKEN': access_token
	 },
	 xhrFields: {
		withCredentials: true
	 },
	 dataType: "JSON",
	 beforeSend: () => {
		 // hide delete modal
		 app_modal({
			 show: false,
			 name: "delete",
		 });
		 // Show waiting alert modal
		 app_modal({
			 show: true,
			 name: "alert",
			 buttons: false,
			 body: loadingSVG("32px", null, "margin:auto"),
		 });
	 },
	 success: (data) => {
		 // delete contact from the list
		 $(".listOfContacts")
			 .find(".messenger-list-item[data-contact-id=" + id + "]")
			 .remove();
		 // refresh info
		 IDinfo(id, getMessengerType());

		 if (!data.deleted)
			 console.error("Error occurred, messages can not be deleted!");

		 // Hide waiting alert modal
		 app_modal({
			 show: false,
			 name: "alert",
			 buttons: true,
			 body: "",
		 });
	 },
	 error: () => {
		 console.error("Server error, check your response");
	 },
 });
}

/**
*-------------------------------------------------------------
* Delete Message By ID
*-------------------------------------------------------------
*/
function deleteMessage(id) {
 $.ajax({
	 url: url + "/deleteMessage",
	 method: "POST",
	 data: {
		 id: id
	 },
	 headers: {
		 'X-CSRF-TOKEN': access_token
	 },
	 xhrFields: {
		withCredentials: true
	 },
	 dataType: "JSON",
	 beforeSend: () => {
		 // hide delete modal
		 app_modal({
			 show: false,
			 name: "delete",
		 });
		 // Show waiting alert modal
		 app_modal({
			 show: true,
			 name: "alert",
			 buttons: false,
			 body: loadingSVG("32px", null, "margin:auto"),
		 });
	 },
	 success: (data) => {
		 $(".messages").find(`.message-card[data-id=${id}]`).remove();
		 if (!data.deleted)
			 console.error("Error occurred, message can not be deleted!");

		 sendMessageDeleteEvent(id);

		 // Hide waiting alert modal
		 app_modal({
			 show: false,
			 name: "alert",
			 buttons: true,
			 body: "",
		 });
	 },
	 error: () => {
		 console.error("Server error, check your response");
	 },
 });
}

/**
*-------------------------------------------------------------
* Update Settings
*-------------------------------------------------------------
*/
function updateSettings() {
 const formData = new FormData($("#update-settings")[0]);
 if (messengerColor) {
	 formData.append("messengerColor", messengerColor);
 }
 if (dark_mode) {
	 formData.append("dark_mode", dark_mode);
 }
 $.ajax({
	 url: url + "/updateSettings",
	 method: "POST",
	 data: formData,
	 dataType: "JSON",
	 headers: {
		 'X-CSRF-TOKEN': access_token
	 },
	 xhrFields: {
		withCredentials: true
	 },
	 processData: false,
	 contentType: false,
	 beforeSend: () => {
		 // close settings modal
		 app_modal({
			 show: false,
			 name: "settings",
		 });
		 // Show waiting alert modal
		 app_modal({
			 show: true,
			 name: "alert",
			 buttons: false,
			 body: loadingSVG("32px", null, "margin:auto"),
		 });
	 },
	 success: (data) => {
		 if (data.error) {
			 // Show error message in alert modal
			 app_modal({
				 show: true,
				 name: "alert",
				 buttons: true,
				 body: data.msg,
			 });
		 } else {
			 // Hide alert modal
			 app_modal({
				 show: false,
				 name: "alert",
				 buttons: true,
				 body: "",
			 });

			 // reload the page
			 location.reload(true);
		 }
	 },
	 error: () => {
		 console.error("Server error, check your response");
	 },
 });
}

/**
*-------------------------------------------------------------
* Set Active status
*-------------------------------------------------------------
*/
function setActiveStatus(status, user_id) {
 $.ajax({
	 url: url + "/setActiveStatus",
	 method: "POST",
	 data: {
		 user_id: user_id,
		 status: status
	 },
	 headers: {
		 'X-CSRF-TOKEN': access_token
	 },
	 xhrFields: {
		withCredentials: true
	 },
	 dataType: "JSON",
	 success: (data) => {
		 // Nothing to do
	 },
	 error: () => {
		 console.error("Server error, check your response");
	 },
 });
}

/**
*-------------------------------------------------------------
* On DOM ready
*-------------------------------------------------------------
*/
$(document).ready(function () {
 // get contacts list
 getContacts();

 // get contacts list
 getFavoritesList();

 // Clear typing timeout
 clearTimeout(typingTimeout);

 // NProgress configurations
 NProgress.configure({
	 showSpinner: false,
	 minimum: 0.7,
	 speed: 500
 });

 // make message input autosize.
 autosize($(".m-send"));

 // check if pusher has access to the channel [Internet status]
 pusher.connection.bind("state_change", function (states) {
	 let selector = $(".internet-connection");
	 checkInternet(states.current, selector);
	 // listening for pusher:subscription_succeeded
	 channel.bind("pusher:subscription_succeeded", function () {
		 // On connection state change [Updating] and get [info & msgs]
		 if (getMessengerId() != 0) {
			 if (
				 $(".messenger-list-item")
				 .find("tr[data-action]")
				 .attr("data-action") == "1"
			 ) {
				 $(".messenger-listView").hide();
			 }
			 IDinfo(getMessengerId(), getMessengerType());
		 }
	 });
 });

 // tabs on click, show/hide...
 $(".messenger-listView-tabs a").on("click", function () {
	 var dataView = $(this).attr("data-view");
	 $(".messenger-listView-tabs a").removeClass("active-tab");
	 $(this).addClass("active-tab");
	 $(".messenger-tab").hide();
	 $(".messenger-tab[data-view=" + dataView + "]").show();
 });

 // set item active on click
 $("body").on("click", ".messenger-list-item", function () {
	 const dataView = $(".messenger-list-item")
		 .find("p[data-type]")
		 .attr("data-type");
	 $(".messenger-tab").hide();
	 $(".messenger-tab[data-view=" + dataView + "s]").show();

	 $(".messenger-list-item").removeClass("m-list-active");
	 $(this).addClass("m-list-active");
	 const user_uid = $(this).attr("data-contact");
	 const user_id  = $(this).attr("data-contact-id");
	 routerPush(document.title, `${url}/${user_uid}`);
	 updateSelectedContact(user_id);
	 // Remove unseen counter
	 const counter_new_messages = $(this).find('.new-messages-counter')[0];
	 if (counter_new_messages) {
		counter_new_messages.remove();
	 }
 });

 // show info side button
 $(".messenger-infoView nav a , .show-infoSide").on("click", function () {
	 $(".messenger-infoView").toggle();
 });

 // make favorites card dragable on click to slide.
 hScroller(".messenger-favorites");

 // click action for list item [user/group]
 $("body").on("click", ".messenger-list-item", function () {
	 if ($(this).find("tr[data-action]").attr("data-action") == "1") {
		 $(".messenger-listView").hide();
	 }
	 const dataId = $(this).find("p[data-id]").attr("data-id");
	 const dataType = $(this).find("p[data-type]").attr("data-type");
	 setMessengerId(dataId);
	 setMessengerType(dataType);
	 IDinfo(dataId, dataType);
 });

 // click action for favorite button
 $("body").on("click", ".favorite-list-item", function () {
	 if ($(this).find("div").attr("data-action") == "1") {
		 $(".messenger-listView").hide();
	 }
	 const id = $(this).find("div.avatar").attr("data-contact-id");
	 const uid = $(this).find("div.avatar").attr("data-contact");
	 setMessengerId(id);
	 setMessengerType("user");
	 IDinfo(id, "user");
	 updateSelectedContact(id);
	 routerPush(document.title, `${url}/${uid}`);
 });

 // list view buttons
 $(".listView-x").on("click", function () {
	 $(".messenger-listView").hide();
 });
 $(".show-listView").on("click", function () {
	 $(".messenger-listView").show();
 });

 // click action for [add to favorite] button.
 $(".add-to-favorite").on("click", function () {
	 star(getMessengerId());
 });

 // calling Css Media Queries
 cssMediaQueries();

 // message form on submit.
 $("#message-form").on("submit", (e) => {
	 e.preventDefault();
	 sendMessage();
 });

 // message input on keyup [Enter to send, Enter+Shift for new line]
 $("#message-form .m-send").on("keyup", (e) => {
	 // if enter key pressed.
	 if (e.which == 13 || e.keyCode == 13) {
		 // if shift + enter key pressed, do nothing (new line).
		 // if only enter key pressed, send message.
		 if (!e.shiftKey) {
			 triggered = isTyping(false);
			 sendMessage();
		 }
	 }
 });

 // On [upload attachment] input change, show a preview of the image/file.
 $("body").on("change", ".upload-attachment", (e) => {
	 let file = e.target.files[0];
	 if (!attachmentValidate(file)) return false;
	 let reader = new FileReader();
	 let sendCard = $(".messenger-sendCard");
	 reader.readAsDataURL(file);
	 reader.addEventListener("loadstart", (e) => {
		 $("#message-form").before(loadingSVG());
	 });
	 reader.addEventListener("load", (e) => {
		 $(".messenger-sendCard").find(".loadingSVG").remove();
		 if (!file.type.match("image.*")) {
			 // if the file not image
			 sendCard.find(".attachment-preview").remove(); // older one
			 sendCard.prepend(attachmentTemplate("file", file.name));
		 } else {
			 // if the file is an image
			 sendCard.find(".attachment-preview").remove(); // older one
			 sendCard.prepend(
				 attachmentTemplate("image", file.name, e.target.result)
			 );
		 }
	 });
 });

 function attachmentValidate(file) {
	 const fileElement = $(".upload-attachment");
	 const {
		 name: fileName,
		 size: fileSize
	 } = file;
	 const fileExtension = fileName.split(".").pop();
	 if (
		 !getAllowedExtensions.includes(fileExtension.toString().toLowerCase())
	 ) {
		 alert("file type not allowed");
		 fileElement.val("");
		 return false;
	 }
	 // Validate file size.
	 if (fileSize > getMaxUploadSize) {
		 alert("File is too large!");
		 return false;
	 }
	 return true;
 }

 // Attachment preview cancel button.
 $("body").on("click", ".attachment-preview .cancel", () => {
	 cancelAttachment();
 });

 // typing indicator on [input] keyDown
 $("#message-form .m-send").on("keydown", () => {
	 if (typingNow < 1) {
		 isTyping(true);
		 typingNow = 1;
	 }
	 clearTimeout(typingTimeout);
	 typingTimeout = setTimeout(function () {
		 isTyping(false);
		 typingNow = 0;
	 }, 1000);
 });

 // Image modal
 $("body").on("click", ".chat-image", function () {
	 let src = $(this).css("background-image").split(/"/)[1];
	 $('#imageModalBox').css('display', 'flex');
	 $("#imageModalBoxSrc").attr("src", src);
 });
 $(".imageModal-close").on("click", function () {
	 $("#imageModalBox").hide();
 });

 // Search input on focus
 $(".messenger-search").on("focus", function () {
	 $(".messenger-tab").hide();
	 $('.messenger-tab[data-view="search"]').show();
 });
 $(".messenger-search").on("blur", function () {
	 setTimeout(function () {
		 $(".messenger-tab").hide();
		 $('.messenger-tab[data-view="users"]').show();
	 }, 200);
 });
 // Search action on keyup
 $(".messenger-search").on("keyup", function (e) {
	 $.trim($(this).val()).length > 0 ?
		 $(".messenger-search").trigger("focus") + messengerSearch($(this).val()) :
		 $(".messenger-tab").hide() +
		 $('.messenger-listView-tabs a[data-view="users"]').trigger("click");
 });

 // Delete Conversation button
 $(".messenger-infoView-btns .delete-conversation").on("click", function () {
	 app_modal({
		 name: "delete",
	 });
 });
 // Delete Message Button
 $("body").on("click", ".chatify-hover-delete-btn", function () {
	 app_modal({
		 name: "delete",
		 data: $(this).data("id"),
	 });
 });
 // Delete modal [on delete button click]
 $(".app-modal[data-name=delete]")
	 .find(".app-modal-footer .delete")
	 .on("click", function () {
		 const id = $("body")
			 .find(".app-modal[data-name=delete]")
			 .find(".app-modal-card")
			 .attr("data-modal");
		 if (id == 0) {
			 deleteConversation(getMessengerId());
		 } else {
			 deleteMessage(id);
		 }
		 app_modal({
			 show: false,
			 name: "delete",
		 });
	 });
 // delete modal [cancel button]
 $(".app-modal[data-name=delete]")
	 .find(".app-modal-footer .cancel")
	 .on("click", function () {
		 app_modal({
			 show: false,
			 name: "delete",
		 });
	 });

 // on submit settings' form
 $("#update-settings").on("submit", (e) => {
	 e.preventDefault();
	 updateSettings();
 });
 // Settings modal [cancel button]
 $(".app-modal[data-name=settings]")
	 .find(".app-modal-footer .cancel")
	 .on("click", function () {
		 app_modal({
			 show: false,
			 name: "settings",
		 });
		 cancelUpdatingAvatar();
	 });
 // upload avatar on change
 $("body").on("change", ".upload-avatar", (e) => {
	 // store the original avatar
	 if (defaultAvatarInSettings == null) {
		 defaultAvatarInSettings = $(".upload-avatar-preview").css(
			 "background-image"
		 );
	 }
	 let file = e.target.files[0];
	 if (!attachmentValidate(file)) return false;
	 let reader = new FileReader();
	 reader.readAsDataURL(file);
	 reader.addEventListener("loadstart", (e) => {
		 $(".upload-avatar-preview").append(
			 loadingSVG("42px", "upload-avatar-loading")
		 );
	 });
	 reader.addEventListener("load", (e) => {
		 $(".upload-avatar-preview").find(".loadingSVG").remove();
		 if (!file.type.match("image.*")) {
			 // if the file is not an image
			 console.error("File you selected is not an image!");
		 } else {
			 // if the file is an image
			 $(".upload-avatar-preview").css(
				 "background-image",
				 'url("' + e.target.result + '")'
			 );
		 }
	 });
 });
 // change messenger color button
 $("body").on("click", ".update-messengerColor .color-btn", function () {
	 messengerColor = $(this).attr("data-color");
	 $(".update-messengerColor .color-btn").removeClass("m-color-active");
	 $(this).addClass("m-color-active");
 });
 // Switch to Dark/Light mode
 $("body").on("click", ".dark-mode-switch", function () {
	 if ($(this).attr("data-mode") == "0") {
		 $(this).attr("data-mode", "1");
		 $(this).removeClass("far");
		 $(this).addClass("fas");
		 dark_mode = "dark";
	 } else {
		 $(this).attr("data-mode", "0");
		 $(this).removeClass("fas");
		 $(this).addClass("far");
		 dark_mode = "light";
	 }
 });

 //Messages pagination
 actionOnScroll(
	 ".m-body.messages-container",
	 function () {
		 fetchMessages(getMessengerId(), getMessengerType());
	 },
	 true
 );
 //Contacts (users) pagination
 actionOnScroll(".messenger-tab.users-tab", function () {
	 getContacts();
 });
 //Search pagination
 actionOnScroll(".messenger-tab.search-tab", function () {
	 messengerSearch($(".messenger-search").val());
 });
});

/**
*-------------------------------------------------------------
* Observer on DOM changes
*-------------------------------------------------------------
*/
let previousMessengerId = getMessengerId();
const observer = new MutationObserver(function (mutations) {
 if (getMessengerId() !== previousMessengerId) {
	 previousMessengerId = getMessengerId();
	 initClientChannel();
 }
});
const config = {
 subtree: true,
 childList: true
};

// start listening to changes
observer.observe(document, config);

// stop listening to changes
// observer.disconnect();

/**
*-------------------------------------------------------------
* Resize messaging area when resize the viewport.
* on mobile devices when the keyboard is shown, the viewport
* height is changed, so we need to resize the messaging area
* to fit the new height.
*-------------------------------------------------------------
*/
var resizeTimeout;
window.visualViewport.addEventListener("resize", (e) => {
 clearTimeout(resizeTimeout);
 resizeTimeout = setTimeout(function () {
	 const h = e.target.height;
	 if (h) {
		 $(".messenger-messagingView").css({
			 height: h + "px"
		 });
	 }
 }, 100);
});


/**
 * Download attachment
 * @param {Element} e 
 */
function downloadAttachement(e) {

	// Get file name
	const file = e.getAttribute('data-file');

	// Check if file name exists
	if (file) {

		// Disable button
		e.disabled = true;

		// Send request
		axios.get('inbox/download/' + file)
			.then(response => {})
			.catch(error => {
		
				// Error
				if (error.response && error.response.data && error.response.data.message) {
					alert(error.response.data.message)
				}
		
			})
			.finally(() => {

				// Enable button again
				e.disabled = false;

			});

	}

}


/**
 *-------------------------------------------------------------
 * Update and format dates to time ago.
 *-------------------------------------------------------------
 */
function updateTime(){

	// Loop through all time elements
	$( ".message-time" ).each( function( index ) {

		// Get element
		const element        = $(this);

		// Get time
		const created_at     = element.attr('data-time');
		
		// Format time
		const formatted_time = moment(created_at).fromNow();

		// Set formatted time
		element.text( formatted_time );

	});

	// Loop through contacts times
	$( ".contact-item-time" ).each( function() {

		// Get element
		const element        = $(this);

		// Get time
		const created_at     = element.attr('data-time');
		
		// Format time
		const formatted_time = moment(created_at).fromNow();

		// Set formatted time
		element.text( formatted_time );

	});

};                                                                      

// Run this function every minute
setInterval(function() {
	updateTime();
}, 60000);