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
 # ---- v2.1 ----
 'hero_atk': ([(O+'sw/swishes/swish-3.wav',0,None,0,0),(K+'impactPunch_heavy_001.ogg',0,None,120,-4)], -8),
 'hero_whip':([(O+'sw/swishes/swish-12.wav',0,None,0,0),(R+'knifeSlice2.ogg',0,None,90,-2)], -8),
 'ult_hunter':([(O+'sw/swishes/swish-1.wav',0,None,0,0),(O+'sw/swishes/swish-5.wav',0,None,120,0),(O+'sw/swishes/swish-8.wav',0,None,240,0),(K+'impactPunch_heavy_002.ogg',0,None,520,0),(K+'impactWood_heavy_004.ogg',0,None,640,0),(O+'c2/human_03.ogg',0,None,0,-4)], -2),
 'ult_tamer':([(O+'c2/roar_05.ogg',0,None,0,0),(K+'impactSoft_heavy_001.ogg',0,None,200,0),(K+'impactSoft_heavy_003.ogg',0,None,420,0),(K+'impactSoft_heavy_000.ogg',0,None,640,0),(O+'small_dino_raspy_calls.mp3',0,0.88,300,-3)], -2),
 'hero_die': ([(O+'c2/human_06.ogg',0,None,0,0)], -6),
 'revive':   ([(O+'magical_7_0.ogg',0,None,0,0)], -6),
 'tame':     ([(O+'c1/cute_03.ogg',0,None,0,0),(O+'magical_3.ogg',0,None,80,-4)], -5),
 'evolve':   ([(O+'magical_5.ogg',0,None,0,0),(I+'maximize_006.ogg',0,None,0,-2),(K+'impactMining_003.ogg',0,None,250,-4)], -3),
 'torch':    ([(S+'thrusterFire_000.ogg',0,0.6,0,0)], -10),
 'b_carno':  ([(O+'c1/monster_03.ogg',0,None,0,0),(S+'lowFrequency_explosion_000.ogg',0,None,0,-8)], -1),
 'b_croc':   ([(O+'c2/monster_12.ogg',0,None,0,0),(O+'c2/slime_03.ogg',0,None,200,-3)], -1),
 'b_quetzal':([(O+'c1/scream_01.ogg',0,None,0,0),(O+'sw/swishes/swish-10.wav',0,None,100,-2)], -1),
 'b_mammoth':([(O+'monster_roar.wav',0,2.5,0,0),(O+'c1/howl.ogg',0,None,0,-4)], -1),
 'b_lavadrake':([(O+'c2/monster_16.ogg',0,None,0,0),(S+'thrusterFire_004.ogg',0,None,150,-4)], -1),
 'b_queen':  ([(O+'c1/scream_02.ogg',0,None,0,0),(O+'small_dino_raspy_calls.mp3',2.0,1.0,250,-2)], -1),
 'sk_charge':([(O+'c2/stomp_01.ogg',0,None,0,0),(K+'impactSoft_heavy_002.ogg',0,None,180,0),(K+'impactSoft_heavy_004.ogg',0,None,360,0)], -3),
 'sk_submerge':([(O+'c2/slime_06.ogg',0,None,0,0),(S+'slime_001.ogg',0,None,100,-2)], -5),
 'sk_gust':  ([(O+'sw/swishes/swish-13.wav',0,None,0,0),(O+'sw/swishes/swish-11.wav',0,None,150,0)], -4),
 'sk_stomp': ([(S+'lowFrequency_explosion_001.ogg',0,None,0,0),(O+'ice/IceShatters/LedasLuzta.ogg',0,None,120,-3)], -2),
 'sk_fire':  ([(S+'thrusterFire_003.ogg',0,None,0,0),(S+'explosionCrunch_001.ogg',0,None,300,-5)], -3),
 'sk_summon':([(O+'c2/attack_02.ogg',0,None,0,0),(O+'small_dino_raspy_calls.mp3',0,0.88,250,-3)], -3),
}
LOOPS = {  # name: (file, start, dur)
 'amb_rain': (O+'rain/1.mp3', 0, 24),
 'amb_wind': (O+'winter-wind.mp3', 10, 24),
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
for name,(f,ss,d) in LOOPS.items():  # 環境音：-26 LUFS，頭尾交叉淡入淡出以便循環
    run(['ffmpeg','-y','-hide_banner','-v','error','-ss',str(ss),'-t',str(d+1.5),'-i',f,'-filter_complex',
         f'[0:a]loudnorm=I=-26:TP=-6,aformat=sample_rates=44100:channel_layouts=mono,asplit[a][b];[a]atrim=0:{d},asetpts=PTS-STARTPTS[x];[b]atrim={d}:{d+1.5},asetpts=PTS-STARTPTS[y];[y][x]acrossfade=d=1.5[m]',
         '-map','[m]','-b:a','64k',OUT+f'/sfx/{name}.mp3'])
    print('loop',name)
