import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Mail, Phone, MapPin, ArrowLeft, Send, CheckCircle2, Loader2, ExternalLink, MessageCircle, Instagram, Facebook } from 'lucide-react';

const ENDERECO_IFES = 'Rodovia+ES+080+Km+93+Santa+Teresa+ES+29660-000';
const ENDERECO_AGRIFES = ENDERECO_IFES;

export default function Contato() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', celular: '', assunto: '', mensagem: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.celular || !form.mensagem) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setSending(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('_captcha', 'false');
      payload.append('_subject', form.assunto || 'Contato via site IRRIFES');
      payload.append('nome', form.nome);
      payload.append('celular', form.celular);
      payload.append('mensagem', form.mensagem);

      const res = await fetch('https://formsubmit.co/ajax/irrifestensiometro@gmail.com', {
        method: 'POST',
        body: payload,
      });

      if (!res.ok) throw new Error('Falha no envio');

      setSent(true);
      setForm({ nome: '', celular: '', assunto: '', mensagem: '' });
    } catch {
      setError('Erro ao enviar. Tente novamente ou envie um e-mail diretamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-[#f0faf0] via-white to-[#faf5f0]">

      {/* ---- HEADER ---- */}
      <div className="bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-[#356b46] to-[#2D7D46] p-2 rounded-lg">
              <Droplet size={20} className="text-white" />
            </div>
            <span className="font-extrabold text-lg text-slate-800">IRRIFES</span>
          </button>
          <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition-colors">
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-20">

        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight">Fale Conosco</h1>
          <p className="text-slate-500 mt-3 text-lg">Estamos prontos para ajudar você a transformar sua irrigação.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 md:gap-16">

          {/* ---- LADO ESQUERDO: CONTATOS ---- */}
          <div className="space-y-10">

            {/* 1. IRRFES */}
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center space-x-2">
                <div className="bg-[#356b46]/10 p-2 rounded-lg">
                  <Droplet size={18} className="text-[#356b46]" />
                </div>
                <span>IRRIFES</span>
              </h2>

              <div className="space-y-4">
                <a href="mailto:irrifestensiometro@gmail.com" className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-[#356b46]/30 hover:shadow-md transition-all group">
                  <div className="bg-emerald-50 p-3 rounded-xl group-hover:bg-[#356b46]/10 transition-colors">
                    <Mail size={20} className="text-[#356b46]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">E-mail</p>
                    <p className="text-sm font-semibold text-slate-700">irrifestensiometro@gmail.com</p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-[#356b46] transition-colors" />
                </a>

                <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100 opacity-60">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <Phone size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Telefone</p>
                    <p className="text-sm font-semibold text-slate-500">Em breve</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100">
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <MapPin size={20} className="text-[#356b46]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Localização</p>
                    <p className="text-sm font-semibold text-slate-700">IFES Campus Santa Teresa</p>
                    <p className="text-xs text-slate-400">Mesmo endereço da Agrifes Jr. (veja abaixo)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. AGRIFES JR. */}
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center space-x-2">
                <div className="bg-[#b57d59]/10 p-2 rounded-lg">
                  <MapPin size={18} className="text-[#b57d59]" />
                </div>
                <span>Agrifes Jr.</span>
              </h2>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Empresa Júnior de Consultoria Agronômica do IFES, Campus Santa Teresa.
              </p>

              <div className="space-y-3">
                <a href="https://wa.me/5527998178185" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-400/40 hover:shadow-md transition-all group">
                  <div className="bg-emerald-50 p-3 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <MessageCircle size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">WhatsApp / Celular</p>
                    <p className="text-sm font-semibold text-slate-700">(27) 99817-8185 / (27) 99609-5898</p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </a>

                <a href="tel:+552732597878" className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group">
                  <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-slate-100 transition-colors">
                    <Phone size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Telefone Fixo</p>
                    <p className="text-sm font-semibold text-slate-700">(27) 3259-7878 / (27) 3259-7895</p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-slate-600 transition-colors" />
                </a>

                <a href="mailto:vendasagrifesjr@gmail.com" className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-[#b57d59]/30 hover:shadow-md transition-all group">
                  <div className="bg-orange-50 p-3 rounded-xl group-hover:bg-[#b57d59]/10 transition-colors">
                    <Mail size={20} className="text-[#b57d59]" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">E-mail</p>
                    <p className="text-sm font-semibold text-slate-700">vendasagrifesjr@gmail.com</p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-[#b57d59] transition-colors" />
                </a>

                <div className="flex gap-3 pt-1">
                  <a href="https://www.instagram.com/agrifesjunior" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-pink-200 hover:shadow-md transition-all group text-sm">
                    <Instagram size={18} className="text-pink-500" />
                    <span className="font-medium text-slate-600 group-hover:text-pink-600">@agrifesjunior</span>
                  </a>
                  <a href="https://www.facebook.com/AgrifesJr" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group text-sm">
                    <Facebook size={18} className="text-blue-600" />
                    <span className="font-medium text-slate-600 group-hover:text-blue-700">Agrifes Jr.</span>
                  </a>
                </div>

                <a
                  href={`https://www.google.com/maps/search/${ENDERECO_AGRIFES}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group"
                >
                  <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-slate-100 transition-colors">
                    <MapPin size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Endereço</p>
                    <p className="text-sm font-semibold text-slate-700">Rodovia ES 080, Km 93 - Santa Teresa, ES</p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-slate-600 transition-colors" />
                </a>
              </div>
            </div>

          </div>

          {/* ---- LADO DIREITO: FORMULÁRIO ---- */}
          <div>
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-slate-100 sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Envie sua mensagem</h2>

              {sent ? (
                <div className="text-center py-12">
                  <div className="bg-emerald-50 p-4 rounded-2xl w-fit mx-auto mb-4">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-2">Mensagem enviada!</h3>
                  <p className="text-slate-500 text-sm mb-6">Recebemos sua mensagem e responderemos em breve.</p>
                  <button onClick={() => setSent(false)} className="text-[#356b46] font-bold hover:underline text-sm">
                    Enviar outra mensagem
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome *</label>
                    <input
                      type="text"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46]/20 focus:border-[#356b46] outline-none transition-all bg-slate-50/50"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Celular *</label>
                    <input
                      type="tel"
                      name="celular"
                      value={form.celular}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46]/20 focus:border-[#356b46] outline-none transition-all bg-slate-50/50"
                      placeholder="(27) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assunto</label>
                    <select
                      name="assunto"
                      value={form.assunto}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46]/20 focus:border-[#356b46] outline-none transition-all bg-slate-50/50 text-slate-700"
                    >
                      <option value="">Selecione um assunto</option>
                      <option value="Quero ser produtor">Quero ser produtor</option>
                      <option value="Quero ser consultor/agrônomo">Quero ser consultor/agrônomo</option>
                      <option value="Suporte técnico">Suporte técnico</option>
                      <option value="Parcerias">Parcerias</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mensagem *</label>
                    <textarea
                      name="mensagem"
                      value={form.mensagem}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#356b46]/20 focus:border-[#356b46] outline-none transition-all bg-slate-50/50 resize-none"
                      placeholder="Escreva sua mensagem..."
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#356b46] hover:bg-[#2a5538] text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-green-200 hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Enviar Mensagem</span>
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-400 text-center">
                    Ou envie um e-mail para{' '}
                    <a href="mailto:irrifestensiometro@gmail.com" className="text-[#356b46] font-medium hover:underline">
                      irrifestensiometro@gmail.com
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
