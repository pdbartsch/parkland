# teach-my-kids-python

I'm working on a plan to teach Python to my young children. Currently (end of 2018) my audience is under 8 years old. I hope to eventually expand this to include a slightly larger audience of other elementary aged kids, but for now I'll test this out on my own children.

## micro-controllers!

We'll be utilizing micro-controllers with lots of blinking lights, buttons, switches and buzzers to help keep these kids interested. I really like [Adafruit's Circuit Playground Express, so we'll be using that with CircuitPython](https://learn.adafruit.com/adafruit-circuit-playground-express/circuitpython-quickstart) and may add some motors with help from the [Crickit](https://www.adafruit.com/product/3093?gclid=Cj0KCQiAsJfhBRCaARIsAO68ZM6D8W45itYHcCcBBB-zOQTH8A3w2Unb3ZAM0Kaw2sDFerAWxhJw0VQaAjzREALw_wcB) shield.

## jupyter notebooks

Notebooks are a nice way to run python code line by line. There are several option to run these in the cloud. That's a nice option if using a Chromebook.
Here are some options for using a jupyter notebook on the internet:

- [Google's Colaboratory](https://colab.research.google.com/)
- [Microsoft's Azure Notebooks](https://notebooks.azure.com/)
- [nbviewer](https://nbviewer.jupyter.org/) for read only. For example, you could view our first lesson [here](https://nbviewer.jupyter.org/github/pdbartsch/teach-my-kids-python/blob/master/01_hello.ipynb).

## venv

kinder-sight-words>venv\Scripts\activate

## [gcloud](https://gist.github.com/pydevops/cffbd3c694d599c6ca18342d3625af97)

gcloud app deploy
gcloud app update
gcloud app browse
gcloud auth list
gcloud config set account `ACCOUNT`
gcloud projects list
gcloud config set project `PROJECT NAME`
