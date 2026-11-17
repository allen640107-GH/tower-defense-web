#!/usr/bin/env python3
"""Build game audio from downloaded CC0 / CC-BY sources (see CREDITS.md).
Source packs are expected in $AUDIOSRC (default /workspace/audiosrc).
Short SFX: trimmed, peak-normalised, category gain, mono mp3.
Music: loudnorm I=-18 LUFS, stereo mp3 96k."""
import os, subprocess, re, sys
SRC = os.environ.get('AUDIOSRC', '/workspace/audiosrc')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'audio')
K = SRC + '/impact-sounds/Audio/'; I = SRC + '/interface-sounds/Audio/'; U = SRC + '/ui-audio/Audio/'
R = SRC + '/rpg-audio/Audio/'; S = SRC + '/sci-fi-sounds/Audio/'; O = SRC + '/oga/'
# name: (inputs[(file, start, dur, delay_ms, gain_db)], target_peak_db)
SFX = {
 'click':    ([(I+'click_002.ogg',0,None,0,0)], -6),
 'back':     ([(I+'back_002.ogg',0,None,0,0)], -6),
 'deny':     ([(I+'error_004.ogg',0,None,0,0)], -8),
 'build':    ([(K+'impactWood_heavy_001.ogg',0,None,0,0),(K+'impactPlank_medium_002.ogg',0,None,90,-4)], -3),
 'upgrade':  ([(I+'maximize_006.ogg',0,None,0,0),(O+'magical_2.ogg',0,None,60,-6)], -4),
 'sell':     ([(R+'handleCoins.ogg',0,None,0,0)], -5),
 'coin':     ([(R+'handleCoins2.ogg',0,0.35,0,0)], -10),
 'spear':    ([(O+'sw/swishes/swish-7.wav',0,None,0,0)], -9),
 'spearhit': ([(K+'impactPunch_medium_001.ogg',0,None,0,0)], -11),
 'lava':     ([(O+'sw/swishes/swish-9.wav',0,None,0,0),(S+'thrusterFire_001.ogg',0,0.35,0,-8)], -7),
 'boom':     ([(S+'explosionCrunch_000.ogg',0,None,0,0)], -5),
 'frost':    ([(O+'freeze.wav',0,0.9,0,0)], -9),
 'shatter':  ([(O+'ice/IceShatters/LedasLuzta.ogg',0,None,0,0)], -8),
 'zap':      ([(S+'forceField_001.ogg',0,0.45,0,0)], -9),
 'venom':    ([(S+'slime_000.ogg',0,None,0,0)], -9),
 'amber':    ([(S+'laserLarge_001.ogg',0,None,0,0)], -8),
 'hit':      ([(K+'impactSoft_medium_001.ogg',0,None,0,0)], -12),
 'roar1':    ([(O+'c2/roar_04.ogg',0,None,0,0)], -6),
 'roar2':    ([(O+'c1/roar_02.ogg',0,None,0,0)], -6),
 'roar3':    ([(O+'small_dino_raspy_calls.mp3',0,0.88,0,0)], -6),
 'die1':     ([(O+'c2/die_01.ogg',0,None,0,0)], -8),
 'die2':     ([(O+'c2/die_03.ogg',0,None,0,0)], -8),
 'die3':     ([(O+'c2/die_04.ogg',0,None,0,0)], -8),
 'boss':     ([(O+'t-rex_calls.mp3',4.16,3.6,0,0),(S+'lowFrequency_explosion_000.ogg',0,None,0,-6)], -1),
 'bossdie':  ([(O+'t-rex_calls.mp3',36.6,3.2,0,0)], -2),
 'meteor':   ([(S+'thrusterFire_002.ogg',0,0.7,0,-3),(S+'lowFrequency_explosion_001.ogg',0,None,650,0),(S+'explosionCrunch_002.ogg',0,None,650,-3)], -1),
 'trap':     ([(R+'chop.ogg',0,None,0,0),(K+'impactWood_medium_002.ogg',0,None,80,-3)], -5),
 'airdrop':  ([(I+'maximize_008.ogg',0,None,0,-2),(K+'impactWood_heavy_003.ogg',0,None,450,0)], -4),
 'item':     ([(O+'magical_1_0.ogg',0,None,0,0)], -6),
 'wave':     ([(K+'impactSoft_heavy_000.ogg',0,None,0,0),(K+'impactSoft_heavy_002.ogg',0,None,260,0),(K+'impactSoft_heavy_004.ogg',0,None,520,2),(O+'c1/roar_02.ogg',0,None,700,-6)], -3),
 'leak':     ([(K+'impactPlate_heavy_002.ogg',0,None,0,0)], -6),
 'rock':     ([(K+'impactMining_002.ogg',0,None,0,0),(K+'impactMining_004.ogg',0,None,120,-2)], -5),
 'erupt':    ([(S+'lowFrequency_explosion_000.ogg',0,None,0,0),(S+'thrusterFire_004.ogg',0,None,100,-4)], -2),
 'achieve':  ([(I+'confirmation_002.ogg',0,None,0,0),(O+'magical_4.ogg',0,None,100,-4)], -5),
 'heal':     ([(O+'magical_6_0.ogg',0,None,0,0)], -12),
}
MUSIC = {
 'intro': ('Strength of the Titans.mp3', 0, 24),
 'menu': ('Five Armies.mp3', 0, None),
 'level1': ('Cretaceous Dawn.mp3', 0, None),
 'level2': ('Dentaneosuchus Hunt.mp3', 0, None),
 'boss': ('Undaunted.mp3', 0, None),
 'win': ('The Curtain Rises.mp3', 0, None),
 'lose': ('The Reveal.mp3', 0, None),
}
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1500:]); sys.exit(1)
    return r.stderr
def maxvol(f):
    e = run(['ffmpeg','-hide_banner','-i',f,'-af','volumedetect','-f','null','-'])
    return float(re.search(r'max_volume: (-?[\d.]+)', e).group(1))
os.makedirs(OUT+'/sfx', exist_ok=True); os.makedirs(OUT+'/music', exist_ok=True)
for name,(ins,peak) in SFX.items():
    args=['ffmpeg','-y','-hide_banner','-v','error']; fl=[]
    for i,(f,ss,d,delay,g) in enumerate(ins):
        if ss: args+=['-ss',str(ss)]
        if d: args+=['-t',str(d)]
        args+=['-i',f]
        fl.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,adelay={delay}|{delay},volume={g}dB[a{i}]')
    mix=''.join(f'[a{i}]' for i in range(len(ins)))
    fl.append(f'{mix}amix=inputs={len(ins)}:normalize=0,afade=t=out:st=0:d=0.001,silenceremove=start_periods=1:start_threshold=-50dB[m]' if False else f'{mix}amix=inputs={len(ins)}:normalize=0[m]')
    tmp='/tmp/sfx_'+name+'.wav'
    run(args+['-filter_complex',';'.join(fl),'-map','[m]',tmp])
    mv=maxvol(tmp); gain=peak-mv
    dur=float(run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',tmp]) or 0) if False else None
    run(['ffmpeg','-y','-hide_banner','-v','error','-i',tmp,'-af',f'volume={gain:.2f}dB,afade=t=out:st=0:d=0' if False else f'volume={gain:.2f}dB','-ac','1','-ar','44100','-b:a','96k',OUT+f'/sfx/{name}.mp3'])
    print('sfx',name,round(gain,1))
for name,(f,ss,d) in MUSIC.items():
    args=['ffmpeg','-y','-hide_banner','-v','error','-ss',str(ss)]
    if d: args+=['-t',str(d)]
    af='loudnorm=I=-18:TP=-1.5:LRA=11'
    if d: af+=f',afade=t=out:st={d-3}:d=3'
    run(args+['-i',SRC+'/music/'+f,'-af',af,'-ar','44100','-ac','2','-b:a','96k',OUT+f'/music/{name}.mp3'])
    print('music',name)
