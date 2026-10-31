'use client';
import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { signIn, signOut } from './actions';

const api = '/api/halloween/dallas';
export default function Booth({ authorized }: { authorized: boolean }) {
  const [login, action, pending] = useActionState(signIn, { error: '' });
  const [status, setStatus] = useState('Camera offline');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [live, setLive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [camera, setCamera] = useState(''), [mic, setMic] = useState('');
  const [muted, setMuted] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const media = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const session = useRef(''), attempt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    attempt.current++;
    if (timer.current) clearTimeout(timer.current);
    if (peer.current) peer.current.onconnectionstatechange = null;
    peer.current?.close(); peer.current = null;
    media.current?.getTracks().forEach(t => t.stop()); media.current = null;
    if (video.current) video.current.srcObject = null;
    const token = session.current; session.current = '';
    if (token) void fetch(api, { method: 'DELETE', headers: { 'X-Broadcast-Session': token }, keepalive: true }).then(r => { if (!r.ok) setError('Camera stopped. Remote session cleanup failed; retry if the input stays busy.'); }).catch(() => setError('Camera stopped. Remote session cleanup could not be confirmed.'));
    setPreview(false); setLive(false); setBusy(false); setMuted(false); setStatus('Camera offline');
  }, []);
  useEffect(() => {
    window.addEventListener('pagehide', stop);
    return () => { window.removeEventListener('pagehide', stop); stop(); };
  }, [stop]);
  function failure(e: unknown) {
    stop();
    const name = e instanceof DOMException ? e.name : '';
    setError(name === 'NotAllowedError' ? 'Allow camera and microphone access in your browser, then retry.' : name === 'NotFoundError' ? 'Connect a camera and microphone, then retry.' : name === 'NotReadableError' ? 'Close other apps using your camera or microphone, then retry.' : e instanceof Error ? e.message : 'Could not connect. Please retry.');
  }
  async function openPreview() {
    const id = ++attempt.current; setBusy(true); setError(''); setStatus('Waiting for camera and microphone permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error('Use this page over HTTPS or localhost in a browser with camera support.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: camera ? { deviceId: { exact: camera } } : true, audio: { ...(mic ? { deviceId: { exact: mic } } : {}), echoCancellation: true, noiseSuppression: true } });
      if (id !== attempt.current) { stream.getTracks().forEach(t => t.stop()); return; }
      media.current = stream;
      stream.getTracks().forEach(t => { t.onended = () => { stop(); setError('A camera or microphone disconnected. Preview again to reconnect.'); }; });
      if (video.current) video.current.srcObject = stream;
      setPreview(true); setBusy(false); setStatus('Preview only · You are not live');
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch (e) { if (id === attempt.current) failure(e); }
  }
  async function goLive() {
    if (!media.current || peer.current) return;
    const id = ++attempt.current; setBusy(true); setError(''); setStatus('Connecting…');
    const pc = new RTCPeerConnection(); peer.current = pc;
    timer.current = setTimeout(() => { if (id === attempt.current) failure(Error('Connection timed out. Preview again and retry.')); }, 30000);
    try {
      media.current.getTracks().forEach(t => pc.addTransceiver(t, { direction: 'sendonly' }));
      pc.onconnectionstatechange = () => {
        if (id !== attempt.current) return;
        if (pc.connectionState === 'connected') { if (timer.current) clearTimeout(timer.current); setLive(true); setBusy(false); setStatus('LIVE · Dallas camera and microphone'); }
        if (['failed', 'disconnected'].includes(pc.connectionState)) failure(Error('Broadcast disconnected. Preview again to reconnect.'));
      };
      await pc.setLocalDescription(await pc.createOffer());
      // Send complete ICE candidates in one offer; this client does not use trickle PATCH.
      await new Promise<void>((resolve, reject) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const timeout = setTimeout(() => { pc.removeEventListener('icegatheringstatechange', changed); reject(Error('Network discovery timed out. Retry on another network.')); }, 10000);
        function changed() { if (pc.iceGatheringState === 'complete') { clearTimeout(timeout); pc.removeEventListener('icegatheringstatechange', changed); resolve(); } }
        pc.addEventListener('icegatheringstatechange', changed);
      });
      if (id !== attempt.current) return;
      const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: pc.localDescription?.sdp, signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? 'Could not start broadcast.');
      if (id !== attempt.current) { void fetch(api, { method: 'DELETE', headers: { 'X-Broadcast-Session': data.session }, keepalive: true }); return; }
      session.current = data.session;
      await pc.setRemoteDescription({ type: 'answer', sdp: data.answer });
    } catch (e) { if (id === attempt.current) failure(e); }
  }
  if (!authorized) return <form action={action} className="space-y-5"><p>Sign in with your designated Dallas host account.</p><label className="form-label">Email<input className="form-input" name="email" type="email" autoComplete="username" required /></label><label className="form-label">Password<input className="form-input" name="password" type="password" autoComplete="current-password" required /></label>{login.error && <p role="alert">{login.error}</p>}<button className="button-primary" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button></form>;
  return <div className="space-y-5"><p>Preview your camera first, then choose Go Live. Wear headphones to prevent sound from feeding back. Keep this page open while broadcasting.</p><video ref={video} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-black object-contain" aria-label="Your camera preview (sound muted locally)" /><p role="status" aria-live="polite">{status}{muted && ' · Microphone muted'}</p>{error && <p role="alert" className="border border-red-800 bg-red-50 p-3 text-red-900">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><label className="form-label">Camera<select className="form-input" value={camera} disabled={preview || busy} onChange={e => setCamera(e.target.value)}><option value="">Default camera</option>{devices.filter(d => d.kind === 'videoinput').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}</select></label><label className="form-label">Microphone<select className="form-input" value={mic} disabled={preview || busy} onChange={e => setMic(e.target.value)}><option value="">Default microphone</option>{devices.filter(d => d.kind === 'audioinput').map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}</select></label></div><p>To change devices, stop, select your devices, then preview again.</p><div className="flex flex-wrap gap-3"><button className="button-primary" disabled={busy || preview} onClick={() => void openPreview()}>Preview camera & mic</button><button className="button-primary" disabled={!preview || busy || live} onClick={() => void goLive()}>Go Live</button><button className="button-primary" onClick={stop}>Stop camera & broadcast</button><button className="button-primary" disabled={!preview} onClick={() => { media.current?.getAudioTracks().forEach(t => t.enabled = muted); setMuted(!muted); }}>{muted ? 'Unmute microphone' : 'Mute microphone'}</button></div><form action={signOut} onSubmit={stop}><button className="underline">Sign out</button></form></div>;
}
