const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Inicializar Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configurar upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// ROTAS DA API

// 1. Cadastrar cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const cliente = req.body;
    const docRef = await db.collection('clientes').add({
      ...cliente,
      dataCadastro: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Adicionar produto (com imagem)
app.post('/api/produtos', upload.single('imagem'), async (req, res) => {
  try {
    const { nome, descricao, preco, estoque } = req.body;
    const imagemUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const docRef = await db.collection('produtos').add({
      nome,
      descricao,
      preco: parseFloat(preco),
      estoque: parseInt(estoque),
      imagemUrl,
      dataCriacao: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Listar produtos
app.get('/api/produtos', async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').get();
    const produtos = [];
    snapshot.forEach(doc => {
      produtos.push({ id: doc.id, ...doc.data() });
    });
    res.json(produtos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Criar pedido
app.post('/api/pedidos', async (req, res) => {
  try {
    const pedido = req.body;
    const docRef = await db.collection('pedidos').add({
      ...pedido,
      status: 'pendente',
      dataPedido: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
