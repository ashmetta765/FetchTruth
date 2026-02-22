# FetchTruth
Don't trust everything you read online! Be more confident with your news sources by using Fetch Truth! This is an LLM powered news verification tool that can help users trust whether their news sources are verified by facts or not.

![](fetchExtensionpic.png)

## Technologies
* Javascript 
* HTML
* [HuggingFace LLM](https://huggingface.co/XSY/albert-base-v2-fakenews-discriminator)
 
## Strategy
* Create web extension
* Send links to model
* Have model return back verification 
* Store results into a database
* Allow users to give feedbacks and store feedbacks in another database
  
## File Setup
> FETCH-TRUTH
> > dashboard.html\
> > feedback.html\
> > fedback.js\
> > manifest.json\
> > popup2.html\
> > testedPopup.js
> > > fetchTruth-server
> > > > fetchtruth.db\
> > > > package.json\
> > > > server.js


