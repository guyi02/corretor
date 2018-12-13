const functions = require('firebase-functions');
const admin = require('firebase-admin');
const firebase = require('firebase');
require('firebase/firestore')
require('firebase/auth')
const express = require('express');
const bodyParser = require('body-parser');
const handlebars = require('handlebars');
const engines = require('consolidate');
const axios = require('axios');

const Api = require('./shared/api')

const app = express()

app.engine('hbs', engines.handlebars)
app.set('views', './views');
app.set('view engine', 'hbs');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// parse application/json
app.use(bodyParser.json())

var config = {
    apiKey: "AIzaSyBfboYTJFXlmOOp4fgafgETtot-6nWUokk",
    authDomain: "corretor-3faf7.firebaseapp.com",
    databaseURL: "https://corretor-3faf7.firebaseio.com",
    projectId: "corretor-3faf7",
    storageBucket: "corretor-3faf7.appspot.com",
    messagingSenderId: "302659859516"
};
firebase.initializeApp(config)
const db = firebase.firestore();
db.settings({
    timestampsInSnapshots: true
});

handlebars.registerHelper('truncate', function (length, context, options) {
    if (context.length > length) {
        return context.substring(0, length) + "...";
    } else {
        return context;
    }
});

function autenticado(req, res, next) {
    var user = firebase.auth().onAuthStateChanged

    if (user !== null) {
        req.user = user
        next();
    } else {
        res.redirect('/login')
    }
}

function updateImovel(id, body) {
    return db.collection('imoveis').doc(id).set(body, {merge: true});
}

function deleteImovel(id) {
    return db.collection('imoveis').doc(id).delete();
}


function getAllImoveis() {
    return db.collection('imoveis');
}

function getImovelById(id) {
    return db.collection('imoveis').doc(id).get();
}

function getImovelFiltered(filter) {
    return db.collection('imoveis').where('cidade', '==', filter).get();
}

/*********************
 *      HOME        *
 **********************/
app.get('/', (req, res) => {

    db.collection('imoveis').limit(3).get().then(snap => {
        let imoveis = [];
        snap.forEach(function (doc) {
            imoveis.push({
                id: doc.id,
                ...doc.data()
            });
        })
        res.render('index', {
            imoveis
        })
    })    
})


/*********************
 * IMOVEL INDIVIDUAL *
 **********************/

app.get('/imovel/:id', (req, res) => {
    let id = req.params.id
    getImovelById(id).then(snap => {
        let imovel = snap.data();
        res.render('imovel', {
            imovel
        })
    })
})

/*********************
 *   CATALOGO        *
 **********************/

app.get('/catalogo', (req, res) => {
    getAllImoveis().get().then(snap => {
        let imoveis = [];
        snap.forEach(function (doc) {
            imoveis.push({
                id: doc.id,
                ...doc.data()
            });
        })
        res.render('catalogo', {
            imoveis
        })
    })

}).post('/pesquisa', (req, res, next) => {
    let data = req.body
    res.redirect('/pesquisa/' + data.cidade)
})

app.get('/pesquisa/:cidade', (req, res, next) => {
    let data = req.params.cidade
    getImovelFiltered(data).then(snap => {
        let imoveis = [];
        snap.forEach(function (doc) {
            imoveis.push({
                id: doc.id,
                ...doc.data()
            })
        })
        res.render('pesquisa', {
            imoveis
        })
    })
})
/*********************
 *   LOGIN           *
 **********************/

app.get('/login', (req, res) => {
    res.render('login')
})

/*********************
 *   DASHBOARD      *
 **********************/

app.get('/painel', autenticado, (req, res) => {
    getAllImoveis().get().then(snap => {
        let imoveis = [];
        snap.forEach(function (doc) {
            imoveis.push({
                ids: doc.id,
                ...doc.data()
            });
        })
        res.render('dashboard', {
            imoveis
        })
    })
})

app.post('/painel', (req, res) => {
    firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.senha).then(user => {
        res.redirect('/painel')
    }).catch(err => console.log(err));
})


/*********************
 *   CADASTRAR      *
 **********************/

app.get('/painel/criar', (req, res) => {
    res.render('criar')
}).post('/painel/criar', (req, res, next) => {

    

    const dt = req.body

    const data = {
    'titulo': dt.titulo,
    'cidade': dt.cidade,
    'quartos': dt.quartos,
    'localidade': dt.localidade,
    'banheiros':dt.banheiros,
    'garagens': dt.garagens,
    'suite': dt.suite, 
    'locacao': dt.locacao,
    'dimensoes': dt.dimensoes,
    'valor': dt.valor,
    'descricao': dt.descricao,
    'imagemCapa': dt.imagemCapa,
    'imagens':[
        dt.imagem1,
        dt.imagem2,
        dt.imagem3,
        dt.imagem4,
        dt.imagem5,
        dt.imagem6
    ]
    }
    
    getAllImoveis().add(data).then(result => {
        res.redirect('/painel')
    })
})


/*********************
 *   EDITAR         *
 **********************/

app.get('/painel/editar/:id', (req, res) => {
    const id = req.params.id
    getImovelById(id).then(snap => {
        const imovel = snap.data();
        res.render('editar', {
            imovel,
            id
        })
    })

}).post('/painel/editar/:id', (req, res) => {
    updateImovel(req.params.id, req.body).then(data => {
        res.redirect('/painel')
    })

})

/*********************
 *   REMOVER         *
 **********************/

app.post('/painel/delete/:id', (req, res) => {
    const id = req.params.id
    deleteImovel(id).then(() => {
        res.redirect('/painel')
    })

})

/*********************
 *   LOGOUT          *
 **********************/

app.get('/logout', (req, res) => {
    firebase.auth().signOut().then(() => {
        res.redirect('/login')
    })
})
exports.app = functions.https.onRequest(app);