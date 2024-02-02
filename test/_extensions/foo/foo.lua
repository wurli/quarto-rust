function CodeBlock(el)
  
  quarto.log.output("-- Before -----------------------------------------------")
  quarto.log.output(el)
  el["text"] = "print(" .. el["text"] .. ")"
  quarto.log.output("-- After ------------------------------------------------")
  quarto.log.output(el)


  return el
end
