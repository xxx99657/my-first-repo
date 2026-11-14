import numpy as np, soundfile as sf, sys
for i in range(1,10):
    x,sr=sf.read(f'line_{i}.wav'); w=int(sr*0.02)
    e=np.array([np.sqrt(np.mean(x[j:j+w]**2)) for j in range(0,len(x),w)]); loud=e>0.01
    idx=np.where(loud)[0]; s,t=idx[0],idx[-1]+1
    out=[]; run=0; maxp=int(0.28/0.02)
    for k in range(max(0,s-2),min(len(e),t+3)):
        if loud[k]: run=0; out.append(x[k*w:(k+1)*w])
        else:
            run+=1
            if run<=maxp: out.append(x[k*w:(k+1)*w])
    y=np.concatenate(out); sf.write(f'tight_{i}.wav',y,sr); print(i, round(len(y)/sr,2))
