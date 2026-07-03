# Running the Ollama + Jupyter + CytoCave Stack on Polaris

This document describes how to start the local development stack used for CytoCave / DeepCytoCave work on Polaris-style compute nodes.

The stack has three main services:

```text
Ollama       → local LLM server, usually port 11434
JupyterLab   → notebook/dev server, usually port 8888
CytoCave     → Node/Express + visualization server, observed on port 3273
```

The commands below assume a Polaris/PBS environment with project storage mounted at `/eagle/DeepCytoCave` and a CytoCave checkout somewhere under `$HOME/work`, `$HOME/work2`, or `$HOME/src`.

Adjust paths, queue names, and account names as needed.

---


## 1. Get an interactive compute node

Do not run heavy Ollama models on a login node. Start an interactive PBS session.

Example using the `DeepCytoCave` account:

```bash
qsub -I -q debug -A DeepCytoCave \
  -l select=1 \
  -l walltime=1:00:00 \
  -l filesystems=eagle:home
```

Other queue/account combinations used during development included:

```bash
qsub -I -q preemptable -A DeepCytoCave \
  -l select=1 \
  -l walltime=1:00:00 \
  -l filesystems=eagle:home
```

Older experiments used `gpu_hack` queues. Prefer the current project/account queues unless specifically instructed otherwise.

Once the job starts, note the compute node name:

```bash
hostname
hostname -s
```

Example node names observed in testing looked like:

```text
x3005c0s13b0n0
x3001c0s1b1n0
x3109c0s25b0n0
```

You will need the compute node name for testing or SSH port forwarding.

---

## 2. Install Ollama locally without root

If Ollama is not installed system-wide, install it into your home directory.

```bash
cd ~
mkdir -p ollama_install
cd ollama_install

curl -L https://ollama.com/download/ollama-linux-amd64.tgz \
  -o ollama-linux-amd64.tgz

mkdir -p usr
tar -C usr -xvf ollama-linux-amd64.tgz
```

Add this to `~/.bashrc`:

```bash
export PATH="$HOME/ollama_install/usr/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/ollama_install/usr/lib:$LD_LIBRARY_PATH"
export OLLAMA_MODELS="$HOME/ollama_install/models"
export OLLAMA_HOST="0.0.0.0:11434"
export no_proxy="localhost,127.0.0.0,127.0.0.1,127.0.1.1"
```

Reload the shell config:

```bash
source ~/.bashrc
```

Check Ollama:

```bash
which ollama
ollama list
```

---

## 3. Pull or verify an Ollama model

Example model used during development:

```bash
ollama pull deepseek-coder-v2:latest
```

Check installed models:

```bash
ollama list
```

Optional quick interactive test:

```bash
ollama run deepseek-coder-v2:latest
```

Exit the model prompt with Ctrl-D or `/bye`.

---

## 4. Start Ollama in a screen session

Use `screen` so the server keeps running while you start Jupyter and CytoCave.

```bash
screen -S ollama
```

Inside the screen session:

```bash
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

Detach from screen:

```text
Ctrl-A then D
```

Check running screen sessions:

```bash
screen -ls
```

Reattach later:

```bash
screen -r ollama
```

If named reattach fails, use the numeric session ID shown by `screen -ls`.

---

## 5. Test Ollama locally on the compute node

From the same compute node:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "deepseek-coder-v2:latest",
  "stream": false,
  "messages": [
    { "role": "user", "content": "why is the sky blue?" }
  ]
}'
```

You can also test using the node hostname:

```bash
curl http://$(hostname -s):11434/api/chat -d '{
  "model": "deepseek-coder-v2:latest",
  "stream": false,
  "messages": [
    { "role": "user", "content": "why is the sky blue?" }
  ]
}'
```

Useful diagnostics:

```bash
lsof -i :11434
netstat -l -n -v | grep 11434
env | grep -i OLLAMA
env | grep -i proxy
```

---

## 6. Start JupyterLab

Start a second screen session:

```bash
screen -S jupyter
```

Inside that screen, activate the desired conda environment. During early development this was often `base`, but use the correct environment for the project.

```bash
conda activate base
```

Start JupyterLab without opening a browser on the compute node:

```bash
jupyter-lab --no-browser --ip=0.0.0.0 --port=8888
```

Detach:

```text
Ctrl-A then D
```

The Jupyter output will include a tokenized URL. Keep that token private.

---

## 7. Start the CytoCave server

Find the CytoCave checkout. Paths used during development included:

```bash
~/src/CytoCave
~/work/CytoCave
~/work2/CytoCave
```

Example:

```bash
cd ~/work2/CytoCave
```

Inspect available npm scripts:

```bash
cat package.json
grep -n "local" package.json
```

Common commands observed during development:

```bash
npm run localapi
```

or:

```bash
npm run localdev
```

Start CytoCave in a screen session:

```bash
screen -S cytocave
cd ~/work2/CytoCave
npm run localapi
```

Detach:

```text
Ctrl-A then D
```

The local API/visualization server was observed on port `3273`.

---

## 8. Test CytoCave from the compute node

Basic checks:

```bash
curl http://localhost:3273
curl http://localhost:3273/visualization
curl http://localhost:3273/visualization.html
```

Demo dataset checks:

```bash
curl 'http://localhost:3273/visualization.html?dataset=Demo1&load=0'
curl 'http://localhost:3273/visualization.html?dataset=Demo1&load=0&lut=freesurfer'
```

API checks observed during development:

```bash
curl http://localhost:3273/api/annotations
curl 'http://localhost:3273/api/annotations?var1=val1'
```

Annotation POST test:

```bash
curl -X POST http://localhost:3273/api/annotate \
  -H "Content-Type: application/json" \
  -d '{"node": "A1", "note": "Interesting cluster"}'
```

If `localhost` works but hostname access does not, test the compute-node hostname:

```bash
curl http://$(hostname -s):3273/visualization.html
```

---

## 9. Access services from your local machine

Compute nodes are usually not directly browser-accessible from your laptop. Use SSH port forwarding.

From your local machine, with the compute node name substituted:

```bash
ssh -L 3273:<compute-node>:3273 \
    -L 8888:<compute-node>:8888 \
    -L 11434:<compute-node>:11434 \
    morrisc@polaris.alcf.anl.gov
```

Example pattern:

```bash
ssh -L 3273:x3005c0s13b0n0:3273 \
    -L 8888:x3005c0s13b0n0:8888 \
    -L 11434:x3005c0s13b0n0:11434 \
    morrisc@polaris.alcf.anl.gov
```

Then open locally:

```text
http://localhost:3273/visualization.html?dataset=Demo1&load=0&lut=freesurfer
http://localhost:8888/lab
http://localhost:11434
```

For the UPENN-GBM DeepCytoCave export, use:

```text
http://localhost:3273/visualization.html?dataset=UPENN_GBM&load=0&lut=upenn_gbm
```

---

## 10. Install or copy a DeepCytoCave dataset

DeepCytoCave expects data under the CytoCave repo’s `data/` directory.

For a generated UPENN-GBM export tarball:

```bash
cd ~/work2/CytoCave
tar -xzf /path/to/UPENN_GBM_deepcytocave_export_UPENN-GBM-00375_11.tgz
```

This should create or merge:

```text
data/
  UPENN_GBM/
    index.txt
    UPENN-GBM-00375_11_edges.csv
    UPENN-GBM-00375_11_topology.csv
    UPENN-GBM-00375_11_metadata.json
    UPENN-GBM-00375_11_cluster_summary.csv
  LookupTable_upenn_gbm.csv
```

Then load:

```text
http://localhost:3273/visualization.html?dataset=UPENN_GBM&load=0&lut=upenn_gbm
```

For bundled demo data, ensure the lookup table is where the app expects it. During debugging, one workaround copied the FreeSurfer LUT into the demo folder:

```bash
cp work2/CytoCave/data/LookupTable_freesurfer.csv work2/CytoCave/data/Demo1/
```

However, the preferred contract is to keep lookup tables at:

```text
data/LookupTable_<lut>.csv
```

---

## 11. Managing screen sessions

List sessions:

```bash
screen -ls
```

Attach to a named session:

```bash
screen -r ollama
screen -r jupyter
screen -r cytocave
```

Detach from an attached screen:

```text
Ctrl-A then D
```

Kill a named screen session:

```bash
screen -S ollama -X quit
screen -S jupyter -X quit
screen -S cytocave -X quit
```

If a foreground server is running in the current shell, stop it with:

```text
Ctrl-C
```

If needed, find and kill a process:

```bash
ps -u $USER
kill <PID>
```

---

## 12. Useful health checks

Check GPU availability:

```bash
nvidia-smi
```

Check active jobs:

```bash
qstat -a | grep $USER
```

Check queues:

```bash
qstat -q
```

Check groups/accounts:

```bash
groups
```

Check listening ports:

```bash
netstat -l -n -v
lsof -i :11434
lsof -i :3273
lsof -i :8888
```

Check node network addresses:

```bash
hostname
ip a
```

---

## 13. Common problems and fixes

### Ollama command not found

Check your local install path:

```bash
ls ~/ollama_install/usr/bin/ollama
echo $PATH
```

Reload `.bashrc`:

```bash
source ~/.bashrc
```

### Ollama is running but API calls fail

Check whether it is bound to the right host/port:

```bash
env | grep OLLAMA
lsof -i :11434
```

Set:

```bash
export OLLAMA_HOST=0.0.0.0:11434
```

Restart `ollama serve`.

### Curl works on compute node but browser cannot open page

Use SSH tunneling from your local machine:

```bash
ssh -L 3273:<compute-node>:3273 \
    -L 8888:<compute-node>:8888 \
    -L 11434:<compute-node>:11434 \
    morrisc@polaris.alcf.anl.gov
```

Then browse to `localhost`.

### `screen` has terminal issues

Set:

```bash
export TERM=vt100
```

Then restart the screen command.

### CytoCave API route not found

Confirm the correct npm script and server port:

```bash
cat package.json
grep -n "local" package.json
grep -n "3273" server.js
```

Try:

```bash
npm run localapi
```

Then test:

```bash
curl http://localhost:3273/visualization.html
```

### Dataset does not load

Check the expected files:

```bash
find data/UPENN_GBM -maxdepth 1 -type f | sort
ls data/LookupTable_upenn_gbm.csv
head data/UPENN_GBM/index.txt
```

Expected URL:

```text
visualization.html?dataset=UPENN_GBM&load=0&lut=upenn_gbm
```

Expected `index.txt` format:

```csv
subjectID,network,topology
UPENN-GBM-00375_11,UPENN-GBM-00375_11_edges.csv,UPENN-GBM-00375_11_topology.csv
```

---

## 14. Minimal startup checklist

On Polaris:

```bash
qsub -I -q debug -A DeepCytoCave \
  -l select=1 \
  -l walltime=1:00:00 \
  -l filesystems=eagle:home
```

On the compute node:

```bash
source ~/.bashrc
```

Start Ollama:

```bash
screen -S ollama
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
# detach with Ctrl-A D
```

Start Jupyter:

```bash
screen -S jupyter
conda activate base
jupyter-lab --no-browser --ip=0.0.0.0 --port=8888
# detach with Ctrl-A D
```

Start CytoCave:

```bash
screen -S cytocave
cd ~/work2/CytoCave
npm run localapi
# detach with Ctrl-A D
```

Test on compute node:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "deepseek-coder-v2:latest",
  "stream": false,
  "messages": [
    { "role": "user", "content": "hello" }
  ]
}'

curl http://localhost:3273/visualization.html
```

From your local machine, tunnel ports:

```bash
ssh -L 3273:<compute-node>:3273 \
    -L 8888:<compute-node>:8888 \
    -L 11434:<compute-node>:11434 \
    morrisc@polaris.alcf.anl.gov
```

Open:

```text
http://localhost:3273/visualization.html?dataset=Demo1&load=0&lut=freesurfer
http://localhost:8888/lab
```

For the UPENN export:

```text
http://localhost:3273/visualization.html?dataset=UPENN_GBM&load=0&lut=upenn_gbm
```

