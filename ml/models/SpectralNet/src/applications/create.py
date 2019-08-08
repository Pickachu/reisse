'''
Expected run times on a GTX 1080 GPU:
MNIST: 1 hr
Reuters: 2.5 hrs
cc: 15 min
'''

from spectralnet import run_net
from core.data import get_data
from collections import defaultdict
import argparse
import sys
import os
# add directories in src/ to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


# PARSE ARGUMENTS
parser = argparse.ArgumentParser()
parser.add_argument('--gpu', type=str, help='gpu number to use', default='')
parser.add_argument('--dset', type=str,
                    help='gpu number to use', default='reisse')
args = parser.parse_args()

# SELECT GPU
os.environ['CUDA_VISIBLE_DEVICES'] = args.gpu

params = defaultdict(lambda: None)

# SET GENERAL HYPERPARAMETERS
general_params = {
    'dset': args.dset,                  # dataset: reuters / mnist
    'val_set_fraction': 0.1,            # fraction of training set to use as validation
    # path for precomputed nearest neighbors (with indices and saved as a pickle or h5py file)
    'precomputedKNNPath': '',
    'siam_batch_size': 128,             # minibatch size for siamese net
}
params.update(general_params)

# SET DATASET SPECIFIC HYPERPARAMETERS
mnist_params = {
    'n_clusters': 10,                   # number of clusters in data
    'use_code_space': False,             # enable / disable code space embedding
    'affinity': 'siamese',              # affinity type: siamese / knn
    # number of nonzero entries (neighbors) to use for graph Laplacian affinity matrix
    'n_nbrs': 3,
    # neighbor used to determine scale of gaussian graph Laplacian; calculated by
    'scale_nbr': 2,
                                        # taking median distance of the (scale_nbr)th neighbor, over a set of size batch_size
                                        # sampled from the datset

    # threshold where, for all k <= siam_k closest neighbors to x_i, (x_i, k) is considered
    'siam_k': 2,
                                        # a 'positive' pair by siamese net

    'siam_ne': 400,                     # number of training epochs for siamese net
    'spec_ne': 400,                     # number of training epochs for spectral net
    'siam_lr': 1e-3,                    # initial learning rate for siamese net
    'spec_lr': 1e-3,                    # initial learning rate for spectral net
    'siam_patience': 10,                # early stopping patience for siamese net
    'spec_patience': 20,                # early stopping patience for spectral net
    'siam_drop': 0.1,                   # learning rate scheduler decay for siamese net
    'spec_drop': 0.1,                   # learning rate scheduler decay for spectral net
    'batch_size': 1024,                 # batch size for spectral net
    'siam_reg': None,                   # regularization parameter for siamese net
    'spec_reg': None,                   # regularization parameter for spectral net
    # subset of the dataset used to construct training pairs for siamese net
    'siam_n': None,
    'siamese_tot_pairs': 600000,        # total number of pairs for siamese net
    'arch': [                           # network architecture. if different architectures are desired for siamese net and
                                        #   spectral net, 'siam_arch' and 'spec_arch' keys can be used
        {'type': 'relu', 'size': 1024},
        {'type': 'relu', 'size': 1024},
        {'type': 'relu', 'size': 512},
        {'type': 'relu', 'size': 10},
    ],
    'use_approx': False,                # enable / disable approximate nearest neighbors

    # enable to use all data for training (no test set)
    'use_all_data': True,
}
params.update(mnist_params)
# LOAD DATA
data = get_data(params)

# RUN EXPERIMENT
x_spectralnet, y_spectralnet = run_net(data, params)

if args.dset in ['cc', 'cc_semisup']:
    # run plotting script
    import plot_2d
    plot_2d.process(x_spectralnet, y_spectralnet, data, params)
