(setq fib
	  (function (n)
				(cond
				 ((= n 1) [0])
				 ((= n 2) [0 1])
				 (t (let (previous (fib (- n 1)))
					  (push previous
							(+ (previous -1)
							   (previous -2))))))))

(console.log (fib 10)) ; [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]