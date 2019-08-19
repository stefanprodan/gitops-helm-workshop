MSG?="up"

sync:
	git add -A && git commit -m $(MSG) && git push origin master
	fluxctl --k8s-fwd-ns=fluxcd sync
