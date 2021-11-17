import { useCallback, useEffect, useState } from 'react';
import kp from './keypair.json';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {
  Program, Provider, BN, web3
} from '@project-serum/anchor';

const { SystemProgram, Keypair } = web3;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);
const programID = new PublicKey(idl.metadata.address);
const cluster = 'devnet';
const network = clusterApiUrl(cluster);

const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const MY_TWITTER_HANDLE = 'rafaolivares77';
const MY_TWITTER_LINK = `https://twitter.com/${MY_TWITTER_HANDLE}`;

const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  // Actions
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider =  new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log('ping');
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log('Created a new BaseAccount w/ address:', baseAccount.publicKey.toString());
      await getGifList();

    } catch (error) {
      console.error('Error creating BaseAccount account:', error);
    }
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link!');
      return;
    }
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue,{
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        }
      });
      console.log('New gif sent!', inputValue);
    } catch (error) {
      console.error('Error sending gif:', error);
    }
  };

  const upVote = async(e) => {
    try {
      e.preventDefault();

      const target = e.target;
      const index = target.value;

      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.upvoteItem(new BN(index),{
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log('Upvoted gif!', index);

      await getGifList();
    } catch (error) {
      console.error('Error upvoting gif:', error);
    }
  }

  const downVote = async(e) => {
    try {
      e.preventDefault();

      const target = e.target;
      const index = target.value;

      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.downvoteItem(new BN(index),{
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log('Downvoted gif! F for your own taste', index);

      await getGifList();
    } catch (error) {
      console.error('Error downvoting gif:', error);
    }
  }

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if(gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } else {
      return(
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">Submit</button>
          </form>
          <div className="gif-grid">
            {gifList.map((item, index) => (
              <div className="gif-item animated" key={index}>
                <img src={item.gifLink} alt={item.gifLink} />
                <p>{item.userAddress.toString()} send this epic gif</p>
                <div className="votes-container">
                  <p>Votes <strong>{item.votes.toString()}</strong></p>
                  <button className="cta-button upvote-button" onClick={upVote} value={index}>+1</button>
                  <button className="cta-button downvote-button" onClick={downVote} value={index}>-1</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  };

  // UseEffects
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = useCallback(async () => {
    try{
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log('Got the account', account);
      setGifList(account.gifList);

    } catch (error) {
      console.error('Error in gifList', error);
      setGifList(null);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log(baseAccount.publicKey.toString());
      console.log('Fetching GIF list...');
      getGifList();
    }
  }, [walletAddress, getGifList]);

  return (
    <div className="App">

			<div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🎮 GIFMER 🎮</p>
          <p className="sub-text">
            Epic gamer gifs in the metaverse! (the good one) ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {/* We just need to add the inverse here! */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <footer className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE} `}</a>
          <a
            className="footer-text"
            href={MY_TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{` by @${MY_TWITTER_HANDLE}`}</a>
        </footer>
      </div>
    </div>
  );
};

export default App;
