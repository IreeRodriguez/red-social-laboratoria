function socialNet() {
  this.checkSetup();

  // DOM elements//
  this.messageList = document.getElementById('messages');
  this.messageForm = document.getElementById('message-form');
  this.messageInput = document.getElementById('message');
  this.submitButton = document.getElementById('submit');
  this.submitImageButton = document.getElementById('submitImage');
  this.imageForm = document.getElementById('image-form');
  this.mediaCapture = document.getElementById('mediaCapture');
  this.userPic = document.getElementById('user-pic');
  this.userName = document.getElementById('user-name');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.feed=document.getElementById('feed');
  this.about=document.getElementById('about');
  this.info=document.getElementById('inf');


  // Guardar mensajes del input al presionar submit//
  this.messageForm.addEventListener('submit', this.saveMessage.bind(this));
  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));


  // subir una imagen en el feed//
  this.submitImageButton.addEventListener('click', function(e) {
    e.preventDefault();
    this.mediaCapture.click();
  }.bind(this));
  this.mediaCapture.addEventListener('change', this.saveImageMessage.bind(this));

  this.initFirebase();
}

// inicializar firebase y los productos a usar//
socialNet.prototype.initFirebase = function() {
    // productos de firebase//
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();
    // escuchar si hay cambios en el estado de usuario.//
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// cargar mensajes desde la base de datos//
socialNet.prototype.loadMessages = function() {
    // /messages/ database path.
    this.messagesRef = this.database.ref('messages');
    // Make sure we remove all previous listeners.
    this.messagesRef.off();

    // cargar solo los ultimos 12 y escuchar si hay nuevos//
    var setMessage = function(data) {
      var val = data.val();
      // console.log(val);
      this.displayMessage(data.key, val.name, val.text, val.photoUrl, val.imageUrl);
    }.bind(this);
    this.messagesRef.limitToLast(12).on('child_added', setMessage);
    this.messagesRef.limitToLast(12).on('child_changed', setMessage);
};

//Guardar mensaje nuevo en firebase//
socialNet.prototype.saveMessage = function(e) {
  e.preventDefault();
  // chequear por mensaje nuevo y usuario logeado//
  if (this.messageInput.value && this.checkSignedInWithMessage()) {

      var currentUser = this.auth.currentUser;
     // nueva entrada en la database//
     this.messagesRef.push({
       name: currentUser.displayName,
       text: this.messageInput.value,
       photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
     }).then(function() {
       // borrar input para que quede vacio//
       socialNet.resetMaterialTextfield(this.messageInput);
       this.toggleButton();
     }.bind(this)).catch(function(error) {
       // console.log('5');
     });
  }
};

// Sets URL de la imagen uplodeada con el url de la imagen que ahora esta guardada en firebase storage//
socialNet.prototype.setImageUrl = function(imageUri, imgElement) {
    // si la imagen esta en firebase su url comenzara con gs:// y rescatamos este url de la base datos.
    if (imageUri.startsWith('gs://')) {
      imgElement.src = socialNet.LOADING_IMAGE_URL; // imagen de espera mientras carga//
      this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) {
        imgElement.src = metadata.downloadURLs[0];
      });
    } else {
      imgElement.src = imageUri;
    }
};

// Guardar el nuevo mensaje con la imagen

socialNet.prototype.saveImageMessage = function(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // borrar la seleccion.
  this.imageForm.reset();

  // chequear si el archivo enviado es una imagen//
  if (!file.type.match('image.*')) {
      alert('Solo puedes compartir imagenes');
    return;
  }
  // si el usuario esta logeado//
  if (this.checkSignedInWithMessage()) {

      // se guarda la imagen en el storage de firebase, de nuevo imagen de cargando mientras se guarda la imagen
         var currentUser = this.auth.currentUser;
         this.messagesRef.push({
           name: currentUser.displayName,
           imageUrl: socialNet.LOADING_IMAGE_URL,
           photoUrl: currentUser.photoURL || '/images/profile_placeholder.png'
         }).then(function(data) {

           var filePath = currentUser.uid + '/' + data.key + '/' + file.name;
           return this.storage.ref(filePath).put(file).then(function(snapshot) {

             var fullPath = snapshot.metadata.fullPath;
             return data.update({imageUrl: this.storage.ref(fullPath).toString()});
           }.bind(this));
         }.bind(this)).catch(function(error) {
           console.error('There was an error uploading a file to Cloud Storage:', error);
         });
  }
};

// loguarse en la pagina
socialNet.prototype.signIn = function() {
    // se usa cuenta de google para acceder
      var provider = new firebase.auth.GoogleAuthProvider();
      this.auth.signInWithPopup(provider);
};

// Signs-out de la pagina//
socialNet.prototype.signOut = function() {
    // Sign out de Firebase.//
   this.auth.signOut();

};

// activa eventos cunado hay cambios en el estado de usuario, si esta logeado o no
socialNet.prototype.onAuthStateChanged = function(user) {
  if (user) { // si el usuario esta signed in//
    // se toma el su foto de perfil de google y su nombre//
    var profilePicUrl = user.photoURL;
    var userName = user.displayName;

    // se coloca nombre y foto en la pagina//
    this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
    this.userName.textContent = userName;

    // se muestra el boton de sign out  y se muestra info del usuario y feed y se oculta el boton de sing in
    this.userName.classList.remove('hide');
    this.userPic.classList.remove('hide');
    this.feed.classList.remove('hide');
    this.about.classList.add('hide');
    this.info.classList.add('hide');

    this.signOutButton.classList.remove('hide');
    this.signInButton.classList.add('hide');

    // se cargan los mensajes de la base de datos//
    this.loadMessages();
} else { // si el usuario esta signed out//
    // se oculta boton de sign out e informacion del usuario y feed, se muentra el boton de sign in
    this.userName.classList.add('hide');
    this.userPic.classList.add('hide');
    this.feed.classList.add('hide');
    this.about.classList.remove('hide');
    this.info.classList.remove('hide');

    this.signOutButton.classList.add('hide');
    this.signInButton.classList.remove('hide');
  }
};

// retorna true si el usuario esta signed in
socialNet.prototype.checkSignedInWithMessage = function() {

    if (this.auth.currentUser) {
     return true;
    } else {
     return false;
    }
};


// limpia o borra input de mensajes
socialNet.resetMaterialTextfield = function(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// plantilla para los mensajes anadidos//
socialNet.MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

//imagen de espera
socialNet.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// mostrar mensajes en la pagina
socialNet.prototype.displayMessage = function(key, name, text, picUrl, imageUri) {
  var div = document.getElementById(key);

  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = socialNet.MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    this.messageList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { //si el mensaje es texto
    messageElement.textContent = text;
    // reemplazar cambio de linea con <br>//
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
} else if (imageUri) { // si es una imagen//
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }.bind(this));
    this.setImageUrl(imageUri, image);
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
};

//desabilitar y habilitar boton de enviar
socialNet.prototype.toggleButton = function() {
  if (this.messageInput.value) {
    this.submitButton.classList.remove('disabled');
  } else {
    this.submitButton.classList.add('disabled');
  }
};

// chequear si el sdk de firebase esta correcto
socialNet.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};

window.onload = function() {
  window.friendlyChat = new socialNet();
};
